const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { AUTH, LINK, SUPPORT_EMAIL, SERVER, DEFAULT_MSG_CREDIT } = require('../config/config');
const { EMAIL_TEMPLATE, MOMENT_FORMAT, ROLE_TYPE, INVITATION_TYPE, RESPONSE_CODE, APPLICATION_ENVIRONMENT } = require('../config/constants/common');
const { getTemplate } = require('../utils/renderTemplate');
const { sendSESMail } = require('../services/email');
const moment = require('moment-timezone');
const bcrypt = require('bcrypt');
const { genHash, generateRandomToken, getCompanyId, formatBrain, formatUser, isInviteAccepted } = require('../utils/helper');
const File = require('../models/file');
const Company = require('../models/company');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const { fileData, removeExistingImage } = require('./uploadFile');
const { defaultCompanyBrain, createDefaultBrain, getDefaultBrain, getGeneralBrain, defaultGeneralBrainMember } = require('./brain');
const { addWorkSpaceDefaultUser, addDefaultWorkSpace } = require('./workspace');
const { extractAuthToken } = require('./company');
const Role = require('../models/role');
const Subscription = require('../models/subscription');
const Brain = require('../models/brains');
const Workspace = require('../models/workspace');
const WorkspaceUser = require('../models/workspaceuser');
const ShareBrain = require('../models/shareBrain');
const mongoose = require('mongoose');
const { linkExpire } = require('../utils/responseCode');
const { createFreshCRMContact } = require('./freshsales');

function generateToken(user, secret = AUTH.JWT_SECRET, expires = AUTH.JWT_ACCESS_EXPIRE) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
        },
        secret,
        {
            expiresIn: expires,
        },
    );
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000);
}

async function lastLogin(user) {
    return User.updateOne({ _id: user._id }, { $set: { lastLogin: Date.now() } });
}

const logIn = async (req) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email, password: { $exists: true } }, { __v: 0, fcmTokens: 0 });
        if (!existingUser) {
            throw new Error(_localize('auth.account_not_found', req, 'email'));
        }

        if (!isInviteAccepted(existingUser.inviteSts)) {
            throw new Error(_localize('auth.not_verified', req, 'email'));
        }

        const checkPassword = await existingUser.comparePassword(req.body.password);
        if (!checkPassword) {
            throw new Error('auth.password_wrong', req);
        }

        // Auto-unblock user if they were blocked
        if (existingUser.tempblocked) {
            await User.findByIdAndUpdate(existingUser._id, { tempblocked: false });
            existingUser.tempblocked = false;
        }

        delete existingUser._doc.password
        const access_token = generateToken(existingUser);
        const refresh_token = generateToken(existingUser, AUTH.JWT_REFRESH_SECRET, AUTH.JWT_REFRESH_EXPIRE);

        const company = await Company.findOne({ _id: existingUser.company.id },{ countryName: 1, countryCode: 1 });
        if (existingUser.mfa) {
            return {
                ...existingUser._doc,
                access_token: generateToken(existingUser, AUTH.JWT_SECRET, '5m'),
            }
        } else {
            await lastLogin(existingUser);
            return {
                ...existingUser._doc,
                access_token,
                refresh_token,
                countryName: company.countryName,
                countryCode: company.countryCode,
                defaultBrain: await getDefaultBrain(existingUser)
            };
        }
    } catch (error) {
        handleError(error, 'Error in auth service login function');
    }
};

const mfaLogin = async (req) => {
    try {
        const token = extractAuthToken(req);

        if (!token) return false;

        const decode = jwt.verify(token, AUTH.JWT_SECRET)

        const user = await User.findOne({ email: decode.email });

        if (!authenticator.check(req.body.otp, user.mfaSecret)) 
            throw new Error(_localize('auth.otp_invalid', req));

        // Auto-unblock user if they were blocked
        if (user.tempblocked) {
            await User.findByIdAndUpdate(user._id, { tempblocked: false });
            user.tempblocked = false;
        }

        return {
            ...user._doc,
            access_token: generateToken(user),
            refreshToken: generateToken(user, AUTH.JWT_REFRESH_SECRET, AUTH.JWT_REFRESH_EXPIRE),
            defaultBrain: await getDefaultBrain(user),
        }
    } catch (error) {
        handleError(error, 'Error - mfaLogin');
    }
}

const refreshToken = async (req, res) => {
    try {
        const token = extractAuthToken(req);
        if (!token) {
            res.message = _localize('module.notFound', req, 'access_token');
            return util.tokenNotProvided(res);
        }
        const decode = jwt.verify(token, AUTH.JWT_REFRESH_SECRET);
        const existingUser = await User.findOne({ email: decode.email }, { email: 1 });
        const result =  generateToken(existingUser);
        res.message = _localize('module.create', req, 'access_token');
        return util.createdDocumentResponse(result, res);
    } catch (error) {
        res.message = _localize('module.notFound', req, 'access_token');
        return util.tokenNotProvided(res);
    }
}

const sendLoginOtp = async (user, emailcode) => {
    try {
        const OTP = generateOtp();
        const sysdate = convertToTz();
        const codeExpiresTime = moment(sysdate).add(10, 'minutes').format(MOMENT_FORMAT);
        await User.findOneAndUpdate({ _id: user._id }, { loginCode: OTP, codeExpiresOn: codeExpiresTime }, { new: true, useFindAndModify: false });
        const emailData = {
            name: user.username,
            otp: OTP
        }
        // getTemplate(emailcode, emailData).then(async (template) => {
        //     await sendSESMail(user.email, template.subject, template.body);
        // })
        return user;
    } catch (error) {
        handleError(error, 'Error in sendLoginOtp');
    }
}

const forgotPassword = async (req) => {
    try {
        const checkUser = await User.findOne({ email: req.body.email,  });
        if (!checkUser) {
            throw new Error(_localize('auth.account_not_found', req, 'email'));
        }
        if (!isInviteAccepted(checkUser.inviteSts)) {
            throw new Error(_localize('auth.not_verified', req, 'email'));
        }

        const generatehash = `${checkUser.password}${genHash()}`;
        const resethash = `${LINK.FRONT_URL}/reset?id=${checkUser._id}&hash=${generatehash}`

        await User.updateOne({ _id: checkUser._id }, { $set: { resetHash: generatehash } })
        const emailData = {
            name: checkUser.fname,
            link: resethash,
        };
        getTemplate(EMAIL_TEMPLATE.FORGOT_PASSWORD, emailData).then(async (template) => {
            await sendSESMail(checkUser.email, template.subject, template.body)
        })
        return true;
    } catch (error) {
        handleError(error, 'Error in forgot password');
    }
}

const changePassword = async (req) => {
    try {
        const user = await User.findById({ _id: req.userId });
        if (!user) {
            throw new Error(_localize('auth.account_not_found', req, 'email'));
        }
        if (!isInviteAccepted(user.inviteSts)) {
            throw new Error(_localize('auth.not_verified', req, 'email'));
        }
        const matchpassword = await user.comparePassword(req.body.oldpassword);
        if (!matchpassword) {
            throw new Error(_localize('auth.old_password_wrong', req))
        }
        const generatenew = await bcrypt.hash(req.body.newpassword, 10);
        await User.updateOne({ _id: user._id }, { $set: { password: generatenew } });
        return true;
    } catch (error) {
        handleError(error, 'Error in change password');
    }
}

const resendLoginOtp = async (req) => {
    try {
        const user = await User.findOne({ email: req.body.email }, { email: 1, username: 1, loginCode: 1, codeExpiresOn: 1, });
        if (!user) {
            throw new Error(_localize('auth.account_not_found', req, 'email'));
        }
        const OTP = generateOtp();
        const sysdate = convertToTz();
        const codeExpiresTime = moment(sysdate).add(10, 'minutes').format(MOMENT_FORMAT);
        await User.updateOne({ _id: user._id }, {
            $unset: {
                loginCode: 1,
                codeExpiresOn: 1
            }
        })
        await User.updateOne({ _id: user._id }, {
            $set: {
                loginCode: OTP,
                codeExpiresOn: codeExpiresTime
            }
        })
        getTemplate(EMAIL_TEMPLATE.RESEND_OTP, {}).then(async (template) => {
            await sendSESMail(user.username, template.subject, template.body);
        })
        return user;
    } catch (error) {
        handleError(error, 'Error in resendLoginOtp');
    }
}

const verifyLoginOtp = async (req) => {
    try {
        const user = await User.findOne({ email: req.user.email }).select('-password');
        if (user.mfa) {
            return true;
        }
        
        if (!authenticator.check(req.body.secret, user.mfaSecret)) 
            throw new Error(_localize('auth.otp_invalid', req));

        const data = {
            mfa: true
        }
        await User.updateOne({ _id: req.userId }, { $set: data });
        return data;
    } catch (error) {
        handleError(error, 'Error in verifyLoginOtp');
    }
}

const resetPassword = async (req) => {
    try {
        let filter;
        const { id, password } = req.body
        if (req.body.resethash) {
            filter = { _id: id, resetHash: req.body.resetHash }
        } else {
            filter = { _id: id }
        }
        const user = await User.findOne(filter);
        if (!user) {
            throw new Error(_localize('auth.invalid_link', req));
        }
        const bcryptPassword = await bcrypt.hash(password, 10);
        await User.updateOne({ _id: user._id }, { $set: { password: bcryptPassword }, $unset: { resetHash: 1 } });
        return true;
    } catch (error) {
        handleError(error, 'Error in reset password');
    }
}

const viewProfile = async (req) => {
    try {
        const checkUser = await User.findById({ _id: req.params.id }, { fcmTokens: 0 });
        if (!checkUser) {
            return false;
        }
        return checkUser;
    } catch (error) {
        handleError(error, 'Error in viewProfile');
    }
}

const updateProfile = async (req) => {
    try {
        const existingUser = await User.findOne({ _id: req.params.id });
        
        if (!existingUser) throw new Error(_localize('auth.account_not_found', req, 'email'));
        
        if (!isInviteAccepted(existingUser.inviteSts)) {
            throw new Error(_localize('auth.not_verified', req, 'email'));
        }
        const payload = { ...req.body, isProfile: true };
        let isPasswordChange = false;

        if (req.body.coverImg === 'null') payload['profile'] = {};

        if (req.body.coverImg === 'null') {
            if (existingUser?.profile?.id) removeExistingImage(existingUser.profile.id, existingUser.profile.uri);
        }
        if (req?.file) {
            const info = fileData(req.file);
            const result = await File.create(info);
            payload['profile'] = {
                name: result.name,
                uri: result.uri,
                mime_type: result.mime_type,
                type: result.type,
                id: result._id
            }
        }
        if (req.body.password) {
            if (req.body.currentpassword) {
                const isMatch = await bcrypt.compare(req.body.currentpassword, existingUser.password);
                if (!isMatch) throw new Error(_localize('auth.current_password', req));
            }
            payload.password = await bcrypt.hash(req.body.password, 10);
            isPasswordChange = true;
        } else {
            delete payload.password;
        }
        const updated = await User.findByIdAndUpdate({ _id: req.params.id }, payload, { new: true });
        
        if(isPasswordChange){
            const emailData = {
                name: req?.user?.fname || updated?.fname || "",
                support_email: process.env.SUPPORT_EMAIL,
            };

            getTemplate(EMAIL_TEMPLATE.RESET_PASSWORD, emailData).then(async (template) => {
                await sendSESMail(existingUser.email, template.subject, template.body);            
            });
        }

        return updated;
    } catch (error) {
        handleError(error, 'Error in update profile');
    }
}

const sendUserSupportMail = (userpayload, supportpayload) => {
    Promise.all([
        getTemplate(EMAIL_TEMPLATE.USER_INVITATION_REQUEST, supportpayload).then(async (template) => {
            await sendSESMail(userpayload.email, template.subject, template.body)
        }),
        getTemplate(EMAIL_TEMPLATE.INVITATION_REQUEST_SUPPORT, userpayload).then(async (template) => {
            await sendSESMail(SUPPORT_EMAIL, template.subject, template.body);
        })
    ])
    return { message: `Our team will reach out to you.` , userLimitExceed:1};
}

const inviteUsers = async (req) => {
    try {
        const { users, roleCode } = req.body;
        /*
            This code is temporary and is used for manual billing management.

            The main functionality revolves around limiting the number of users a company or a company manager can add, 
            based on their allowed user quota.

            1. If the role is COMPANY:
                - It checks the current number of users associated with the company.
                - If the number of users exceeds or reaches the allowed limit, a support email is sent to notify the relevant parties.

            2. If the role is COMPANY_MANAGER:
                - It similarly checks the number of users associated with the company managed by the manager.
                - If the user count exceeds the allowed limit, a support email is triggered.

            The `sendSupportEmail` function is used to send notification emails, and the filter queries are defined based on the role.

            This is a temporary solution and should be replaced with a more robust billing management system in the future.
        */

        const companyId = req.roleCode === ROLE_TYPE.COMPANY ? req.user.company.id : req.user.invitedBy;

        const sendSupportEmail = (companyName, companyEmail) => {
            return sendUserSupportMail(
                { name: companyName, email: companyEmail },
                { name: `${req.user.fname} ${req.user.lname}` }
            );
        };

        let companyObj = {
            name: req.user.company.name,
            slug: req.user.company.slug,
            id: req.user.company.id                        
        }

        if (
            req.roleCode === ROLE_TYPE.COMPANY ||
            req.roleCode === ROLE_TYPE.COMPANY_MANAGER
        ) {
            const companyName =
                req.roleCode === ROLE_TYPE.COMPANY
                    ? req.user.company.name
                    : (await User.findOne({ "company.id": companyId })).company
                        .name;
            sendSupportEmail(companyName, req.user.email);            
        }

        if (req.roleCode === ROLE_TYPE.COMPANY_MANAGER) {
            const companyUser = await User.findOne({ "company.id": companyId });
            companyObj = companyUser.company;
        }


        const emails = users.map(user => user.email);
        const [existingUsers, existingRole] = await Promise.all([
            User.find({ email: { $in: emails } }, { email: 1 }),
            Role.findOne({ code: roleCode }, { code: 1 })
        ])
        
        const sysdate = convertToTz();
        const linkExpiresTime = moment(sysdate).add(24, 'hours').format(MOMENT_FORMAT);

        const newUsers = [];
        const emailPromises = [];
        
        for (const user of users) {
            const inviteHash = `invite?token=${generateRandomToken()}&hash=${genHash()}`;
            const inviteLink = `${LINK.FRONT_URL}/${inviteHash}`;
            const existingUser = existingUsers.find(u => u.email === user.email);

            if (existingUser) {
                throw new Error(_localize('module.alreadyExists', req, user.email));
            } else {
                const newUser = {
                    email: user.email,
                    inviteLink: inviteHash,
                    inviteExpireOn: linkExpiresTime,
                    invited: true,
                    roleId: existingRole._id,
                    roleCode: existingRole.code,
                    invitedBy: companyId,
                    inviteSts: INVITATION_TYPE.PENDING,
                    company: companyObj,
                    msgCredit: DEFAULT_MSG_CREDIT
                };
               newUsers.push(newUser);
            }

            if (!existingUser) {
                const emailTemplate = getTemplate(EMAIL_TEMPLATE.ONBOARD_USER, {
                    link: inviteLink,
                    expire: linkExpiresTime,
                    name: req.user.fname,
                    email: req.user.email
                });
    
                emailPromises.push(emailTemplate.then(async (template) => {
                    await sendSESMail(user.email, template.subject, template.body);
                }));
            }
        }

        if (newUsers.length) {
            const createdUsers = await User.insertMany(newUsers);
            const companyUserUpdates = createdUsers.map(newUser => ({
                updateOne: {
                    filter: { _id: req.user.company.id },
                    update: { $push: { users: { email: newUser.email, id: newUser._id } } }
                }
            }));
            await Company.bulkWrite(companyUserUpdates);
        }

        Promise.all(emailPromises).catch(error => logger.error(error));
        return true;
    } catch (error) {
        handleError(error, 'Error- registerUser');
    }
};

const inviteLogin = async (req) => {
    try {
        const existingUser = await User.findOne({ inviteLink: req.body.inviteLink });
        if(existingUser){
            const sysdate = convertToTz();
            const expireTime = moment(
                existingUser.inviteExpireOn,
                MOMENT_FORMAT,
            ).format(MOMENT_FORMAT);
            if (expireTime >= sysdate) {
                if (existingUser.inviteLink !== req.body.inviteLink) {
                    await User.updateOne({ _id: existingUser._id }, { $set: { inviteSts: INVITATION_TYPE.EXPIRED } });
                    throw new Error(_localize('auth.invalid_link', req));
                }
                Promise.all([
                    User.updateOne(
                        { _id: existingUser._id },
                        {
                            $unset: {
                                inviteLink: 1,
                                inviteExpireOn: 1,
                            },
                            $set: {
                                inviteSts: INVITATION_TYPE.ACCEPT
                            }
                        },
                    ),
                    lastLogin(existingUser),
                ])
                if (existingUser.roleCode === ROLE_TYPE.COMPANY) {
                    const companyObj = {
                        companyNm: existingUser.company.name,
                        slug: existingUser.company.slug,
                        _id: existingUser.company.id,
                    }
                    // this code executed in background don't use await here
                    Promise.allSettled([
                        getTemplate(EMAIL_TEMPLATE.SIGNUP, {
                            name: existingUser.company.name,
                            support_email: SUPPORT_EMAIL
                        }).then(
                        async(template) => {
                            await sendSESMail(existingUser.email, template.subject, template.body);
                        }
                    ),
                        // createPinecornIndex(existingUser, req)
                    ])
                    const defaultWorkSpace = await addDefaultWorkSpace(companyObj, existingUser);
                    if (defaultWorkSpace) {
                        await defaultCompanyBrain(defaultWorkSpace._id, existingUser);
                        await Promise.all([
                            createDefaultBrain(req, defaultWorkSpace._id, existingUser),
                        ]);
                    }

                    const companyDetails = await Company.findOne({ _id: existingUser.company.id }, { countryName: 1, slug: 1, id: 1 });
                    const signupInfoEmail = process.env.SIGNUP_INFO_EMAIL.split(',');

                    getTemplate(EMAIL_TEMPLATE.COMPANY_SIGNUP_INFO, { 
                        firstName: existingUser.fname,
                        lastName: existingUser.lname,
                        email: existingUser.email,
                        companyName: existingUser.company.name,
                        country: companyDetails?.countryName
                    }).then(
                        async(template) => {
                            await sendSESMail(process.env.SUPPORT_EMAIL, template.subject, template.body, [], 
                                signupInfoEmail
                            );
                        }
                    )
                    if (SERVER.NODE_ENV === APPLICATION_ENVIRONMENT.PRODUCTION)
                        createFreshCRMContact({
                            firstName: existingUser.fname,
                            lastName: existingUser.lname,
                            email: existingUser.email,
                            companyName: existingUser.company.name,
                            companyId: existingUser.company.id
                        });
                } else {
                    const defaultWorkSpace = await addWorkSpaceDefaultUser(existingUser);
                    if (defaultWorkSpace) {
                        await Promise.all([
                            createDefaultBrain(req, defaultWorkSpace._id, existingUser),
                            defaultGeneralBrainMember(req, defaultWorkSpace._id, existingUser)
                        ]);
                    }
                }
                const access_token = generateToken(existingUser);
                const refresh_token = generateToken(
                    existingUser,
                    AUTH.JWT_REFRESH_SECRET,
                    AUTH.JWT_REFRESH_EXPIRE,
                );
                return {
                    ...removeLoginFields(existingUser._doc),
                    access_token,
                    refresh_token,
                    defaultBrain: await getDefaultBrain(existingUser)
                };
            }
        }
        if (existingUser)
            return { status: linkExpire, message: 'Your invite link has been expired', data: existingUser.email, code: RESPONSE_CODE.RESEND_LINK }
        throw new Error(_localize('auth.link_expire', req, 'invite'));
    } catch (error) {
        handleError(error, 'Error - inviteLogin');
    }
};

const logout = async (req) => {
    try {
        if (req.body.fcmToken)
            return User.updateOne({ _id: req.body.userId }, { $pull: { fcmTokens: req.body.fcmToken } } );
        return true;
    } catch (error) {
        handleError(error, 'Error - logout');
    }
}

const generateMfaSecret = async (req) => {
    try {
        if (req.body.mfa) {
            const secret = authenticator.generateSecret();
            await User.updateOne({ _id: req.userId }, { $set: { mfaSecret: secret } });
            return {
                secret: secret,
                qrData: await qrcode.toDataURL(
                    authenticator.keyuri(req.user.email, AUTH.QR_NAME, secret)
                )
            }
        }
        return User.findOneAndUpdate({ _id: req.userId }, { mfa: req.body.mfa, $unset: { mfaSecret: 1 }}, { new: true }).select('mfa');
    } catch (error) {
        handleError(error, 'Error - generateMfaSecret');
    }
}

const verifyMfaOtp = async (req) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!authenticator.check(req.body.otp, user.mfaSecret)) throw new Error(_localize('auth.otp_invalid', req));
        await User.updateOne({ _id: user._id }, { $set: { mfa: true } });
        return true;
    } catch (error) {
        handleError(error, 'Error - verifyMfaOtp');
    }
}

async function onBoardProfile(req) {
    try {
        const { fname, lname, password, email } = req.body;
        const hasedPassword = await bcrypt.hash(password, 10);
        const existingUser = await User.findOneAndUpdate(
            { email },
            {
                fname,
                lname,
                password: hasedPassword,
            },
            { new: true }
        ).lean();
        const defaultBrain = await getDefaultBrain(existingUser);
        return { ...existingUser, defaultBrain };
    } catch (error) {
        handleError(error, 'Error - onBoardProfile');
    }
}

function removeLoginFields(user) {
    const removeFields = [
        'password',
        'inviteLink',
        'inviteExpireOn',
        'fcmTokens',
        'fileSize',
        'usedSize',
        'lastLogin',
        'isActive',
        'isProfile',
    ];
    removeFields.forEach(field => delete user[field]);
    return user;
}

const seedGeneralBrainAPI = async (req) => {
    try {
        const { workspaceIds } = req.body;
        console.log(`Started the general brain seeder`);

        // Build query based on whether workspaceIds array is empty or not
        const query = workspaceIds.length > 0 
        ? { _id: { $in: workspaceIds.map(id => new mongoose.Types.ObjectId(id)) } }
        : {};
        const workspaces = await Workspace.find(query);
        const workspaceUsers = await WorkspaceUser.find();
        const shareBrainsCollection = ShareBrain;
        const brainCollection = Brain;
  
        let count = 0;
        let totalWorkspaceUsers = 0;
        const workspaceUserDontHaveAdmin = [];

      for (const workspace of workspaces) {
        count++
        console.log("current count", count);
        
        const existingBrain = await Brain.findOne({
          workspaceId: workspace._id,
          companyId: workspace.company.id,
          title: "General Brain"
        });
  
        if (!existingBrain) {
          
          const adminUser = workspaceUsers.find(
            (user) =>
              user?.workspaceId?.toString() === workspace._id.toString() &&
              (user.role === "ADMIN" || user.role=="COMPANY" || user.role=="MANAGER")
          );
         
          if (!adminUser) {
            console.log(`⚠️ No admin user found for workspace: ${workspace._id}`);
            workspaceUserDontHaveAdmin.push(workspace._id)
          }

          if (adminUser) {
            const newBrain = {
              workspaceId: workspace._id,
              title: "General Brain",
              user: adminUser.user,
              teams: workspace.teams || [],
              companyId: adminUser.companyId,
              slug: "general-brain",
              isShare: true
            };
            const insertedBrain = await brainCollection.create(newBrain);
  
            const getBrainDetails = await brainCollection.findOne({_id: insertedBrain._id});
  
            for (const currWorkspaceUser of workspaceUsers.filter(u => u?.workspaceId?.toString() === workspace._id.toString())) {
              const shareData = {
                brain: formatBrain(getBrainDetails),
                user: formatUser(currWorkspaceUser.user),
                role: currWorkspaceUser.role === "ADMIN" ? "OWNER" : "MEMBER",
               ...(currWorkspaceUser.teamId && {teamId: currWorkspaceUser.teamId}),
                invitedBy: adminUser.companyId
              };
              await shareBrainsCollection.create(shareData);
            }
          }
        }
    
        const workspaceUserCount = workspaceUsers.filter(u => 
          u?.workspaceId?.toString() === workspace._id.toString()
        ).length;
        totalWorkspaceUsers += workspaceUserCount;
      }
      console.log("Total number of workspace users:", totalWorkspaceUsers);
      console.log(`Ending the general brain seeder. Total workspace users: ${totalWorkspaceUsers}`);
      return {
        workspaceUserDontHaveAdmin,
        totalWorkspaceUsers
      }
    } catch (error) {
        console.error(`seedGeneralBrain error:`, error);
    }
};

const updateMcpData = async (req) => {
    try {
        const existingUser = await User.findOne({ _id: req.userId });
        if (!existingUser) throw new Error(_localize('auth.account_not_found', req, 'email'));

        const payload = { ...req.body };
        const updateQuery = payload.isDeleted ? { $unset: payload } : { $set: payload };
        const updated = await User.findByIdAndUpdate({ _id: req.userId }, updateQuery, { new: true });

        return updated;
    } catch (error) {
        handleError(error, 'Error in updateMcpData');
    }
}

module.exports = {
    logIn,
    refreshToken,
    verifyLoginOtp,
    resendLoginOtp,
    resetPassword,
    forgotPassword,
    changePassword,
    viewProfile,
    updateProfile,
    inviteUsers,
    inviteLogin,
    logout,
    verifyMfaOtp,
    mfaLogin,
    generateMfaSecret,
    onBoardProfile,
    seedGeneralBrainAPI,
    seedGeneralBrainAPI,
    updateMcpData
}

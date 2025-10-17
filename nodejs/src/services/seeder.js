const Role = require('../models/role');
const User = require('../models/user');
const dbService = require('../utils/dbService');
const EmailTemplate = require('../models/emailTemplate');
const { ROLE_TYPE, EMAIL_TEMPLATE } = require('../config/constants/common');
const Country = require('../models/country');
const State = require('../models/state');
const City = require('../models/city');
const Notification = require('../models/notification');
const Setting = require('../models/setting');
const logger = require('../utils/logger');
const { LINK } = require('../config/config');
const { randomPasswordGenerator, encryptedData, decryptedData } = require('../utils/helper');
const { getTemplate } = require('../utils/renderTemplate');
const { sendSESMail } = require('../services/email');
const Bot = require('../models/bot');
const CustomGPT = require('../models/customgpt');
const Permission = require('../models/permission');
const PermissionRole = require('../models/permissionRole');
const Prompt = require('../models/prompts');
const mongoose = require('mongoose');
const ShareBrain = require('../models/shareBrain');
const Brain = require('../models/brains');
const Workspace = require('../models/workspace');
const WorkspaceUser = require('../models/workspaceuser');
const { formatBrain,formatUser } = require('../utils/helper');
const SolutionApp = require('../models/solutionApp');
const seedRole = async function () {
    try {
        const roleJSON = require('../seeders/role.json');
        const bulkRole = [];

        for (const iterator of roleJSON) {
            // Use upsert to handle existing roles gracefully
            bulkRole.push({
                updateOne: {
                    filter: { code: iterator.code },
                    update: { 
                        $setOnInsert: {
                            name: iterator.name,
                            code: iterator.code,
                            isActive: iterator.isActive !== undefined ? iterator.isActive : true,
                            canDel: iterator.canDel !== undefined ? iterator.canDel : true
                        }
                    },
                    upsert: true
                }
            });
        }

        if (bulkRole.length) {
            const result = await Role.bulkWrite(bulkRole);
            const insertedCount = result.upsertedCount || 0;
            const modifiedCount = result.modifiedCount || 0;
            const matchedCount = result.matchedCount || 0;
            
            logger.info(`Roles seeded successfully! - Inserted: ${insertedCount}, Modified: ${modifiedCount}, Matched: ${matchedCount}`);
        }

    } catch (error) {
        logger.error('Error in seedRole function ', error);
        throw error; // Re-throw to ensure proper error handling upstream
    }
}

const seedAdmin = async function () {
    try {
        const adminJSON = require('../seeders/admin.json');
        const allAdmin = await User.find({ roleCode: ROLE_TYPE.SUPER_ADMIN });

        for (const iterator of adminJSON) {
            const checkExistingAdmin = allAdmin.find((element) => element.email === iterator.email);
            if (!checkExistingAdmin) {
                const findRole = await dbService.getDocumentByQuery(Role, { code: iterator.role }, { name: 1, code: 1 });
                iterator.roleId = findRole._id;
                iterator.roleCode = findRole.code;
                const randomPass = randomPasswordGenerator();
                iterator.password = randomPass;
                await dbService.createDocument(User, iterator);
                getTemplate(EMAIL_TEMPLATE.SIGNUP_OTP, {
                    name: iterator.username,
                    password: randomPass,
                }).then(async (template) => {
                    await sendSESMail(
                        iterator.email,
                        template.subject,
                        template.body,
                    );
                });
            }
        }
        logger.info('Admin seeded successfully! 👦👩')
    } catch (error) {
        logger.error('Error in seedAdmin function ', error);
    }
}

const seedEmailTemplate = async function () {
    try {
        const emailTemplateJSON = require('../seeders/emailTemplate.json');
        const allTemplate = await EmailTemplate.find();

        const bulkTemplate = [];

        for (const iterator of emailTemplateJSON) {
            const checkExisting = checkByCode(allTemplate, iterator);
            if (!checkExisting) {
                bulkTemplate.push({ insertOne: { document: iterator } })
            } else {
                bulkTemplate.push({ updateOne: { filter: { code: iterator.code }, update: { $set: iterator } } })
            }
        }

        if (bulkTemplate.length) {
            await EmailTemplate.bulkWrite(bulkTemplate);
        }
        logger.info('Email template seeded successfully! 👨‍🔧👨‍🔧👨‍🔧')
    } catch (error) {
        logger.error('Error in seedEmailTemplate', error);
    }
}

function checkByCode(arr, iterable) {
    return arr.find(element => element.code === iterable.code);
}

const seedCountry = async function () {
    try {
        const countryJSON = require('../seeders/country.json');
        const allCountry = await Country.find({});

        const bulkCountry = [];

        for (const iterator of countryJSON) {
            const checkExisting = checkByCode(allCountry, iterator);
            if (!checkExisting) {
                bulkCountry.push({ insertOne: { document: iterator } });
            }
        }

        if (bulkCountry.length) {
            await Country.bulkWrite(bulkCountry);
        }

        logger.info('Country seeded successfully ..');
    } catch (error) {
        logger.error('Error in seedCountry', error);
    }
}

const seedState = async function () {
    try {
        const stateJSON = require('../seeders/state.json');
        const allState = await State.find();

        const countryCodes = stateJSON.map(state => state.countryCode);

        const countries = await Country.find({ code: { $in: countryCodes } }, { code: 1, nm: 1 });

        const bulkState = [];

        for (const iterator of stateJSON) {
            const checkExisting = checkByCode(allState, iterator);
            if (!checkExisting) {
                const result = countries.find(c => c.code === iterator.countryCode);
                iterator.country = {
                    nm: result.nm,
                    code: result.code,
                    dialCode: result.code,
                    id: result._id,
                }

                bulkState.push({ insertOne: { document: iterator } });

            }
        }

        if (bulkState.length) {
            await State.bulkWrite(bulkState);
        }
        logger.info('State seeded successfully..');
    } catch (error) {
        logger.error('Error in seedState', error);
    }
}

const seedCity = async function () {
    try {
        const cityJSON = require('../seeders/city.json');
        const allCity = await City.find();

        const countryCodes = cityJSON.map(city => city.countryCode);
        const stateCodes = cityJSON.map(city => city.stateCode);

        const countries = await Country.find({ code: { $in: countryCodes } }, { code: 1, nm: 1 });
        const states = await State.find({ code: { $in: stateCodes } }, { code: 1, nm: 1 });

        const bulkCity = [];

        for (const iterator of cityJSON) {
            const checkExisting = checkByCode(allCity, iterator);

            if (!checkExisting) {
                const country = countries.find(c => c.code === iterator.countryCode);
                const state = states.find(s => s.code === iterator.stateCode);

                iterator.country = {
                    nm: country.nm,
                    code: country.code,
                    dialCode: country.dialCode,
                    id: country._id,
                }
                iterator.state = {
                    nm: state.nm,
                    code: state.code,
                    id: state._id
                }

                bulkCity.push({ insertOne: { document: iterator } });
            }
        }

        if (bulkCity.length) {
            await City.bulkWrite(bulkCity);
        }

        logger.info('City seeded successfully..');
    } catch (error) {
        logger.error('Error in seedCity', error);
    }
};

const seedNotification = async function () {
    try {
        const notificationJSON = require('../seeders/notification.json');
        const allNotification = await Notification.find();

        const bulkNotification = [];

        for (const iterator of notificationJSON) {
            const checkExisting = checkByCode(allNotification, iterator);
            if (!checkExisting) {
                bulkNotification.push({ insertOne: { document: iterator } })
            }
        }

        if (bulkNotification.length) {
            await Notification.bulkWrite(bulkNotification);
        }

        logger.info('Notification seeded successfully 🤯🤯🤯');
    } catch (error) {
        logger.error('Error in seedNotification ', error);
    }
}

const seedSetting = async function () {
    try {
        const settingJSON = require('../seeders/setting.json');
        const allSetting = await Setting.find();

        const bulkSetting = [];

        for (const iterator of settingJSON) {
            const checkExisting = checkByCode(allSetting, iterator);
            if (!checkExisting) {
                iterator.url = iterator.url?.replaceAll('{{frontUrl}}', LINK.FRONT_URL)
                bulkSetting.push({ insertOne: { document: iterator } })
            }
        }

        if (bulkSetting.length) {
            await Setting.bulkWrite(bulkSetting);
        }
        logger.info('Setting seeded successfully 🔥🔥🔥🔥🔥');
    } catch (error) {
        logger.error('Error in seedSetting', error);
    }
}

const seedDefaultModel = async () => {
    try {
        const modelJSON = require('../seeders/bot.json');
        const allModel = await Bot.find();

        const bulkModel = [];

        for (const iterator of modelJSON) {
            const checkExisting = checkByCode(allModel, iterator);
            if (!checkExisting) {
                bulkModel.push({ insertOne: { document: iterator } });
            } else bulkModel.push({ updateOne: { filter: { code: iterator.code }, update: { $set: iterator } } })
        }

        if (bulkModel.length) {
            await Bot.bulkWrite(bulkModel)
        }

        logger.info('seedDefaultModel seeded successfully 🤯🤯🤯');
    } catch (error) {
        logger.error('Error - seedDefaultModel', error);
    }
}

const seedCustomGPT = async () => {
    try {
        const gptJSON = require('../seeders/customGPT.json');
        const getDefaults = await CustomGPT.find({ defaultgpt: true });
        const bulkGPT = [];

        for (const iterator of gptJSON) {
            const check = getDefaults.find((element) => element.title === iterator.title);
            if (check) bulkGPT.push({ updateOne: { filter: { title: iterator.title }, update: { $set: iterator } } })
            else bulkGPT.push({ insertOne: { document: iterator } });
        }
        if (bulkGPT.length) await CustomGPT.bulkWrite(bulkGPT);

        logger.info('Default custom gpt seeded successfully 🤯🤯🤯')
    } catch (error) {
        logger.error('Error - seedCustomGPT', error);
    }
}

const seedOtherRolePermission = async () => {
    try {
        const permissionJSON = require('../seeders/permission.json');
        const insertRecord = [];
        const allPermissionRole = await PermissionRole.find({});
        for (const element of permissionJSON) {
            const [permissions, role] = await Promise.all([
                Permission.find({ route_name: { $in: element.permissions } }, { _id: 1 }),
                Role.findOne({ code: element.roleCode }, { code: 1 }),
            ])
            for (const element of permissions) {
                const check = allPermissionRole.find(
                    (permissionrole) =>
                        permissionrole.permission_id.toString() ===
                        element._id.toString() &&
                        permissionrole.role_id.toString() ===
                        role._id.toString()
                );
                if (!check)
                    insertRecord.push({
                        insertOne: {
                            document: {
                                permission_id: element._id,
                                role_id: role._id,
                                name: role.code
                            }
                        }
                    })
            }
        }
        if (insertRecord.length) await PermissionRole.bulkWrite(insertRecord);

        logger.info('Role Permission seeded successfully 🤯🤯🤯')
    } catch (error) {
        logger.error('Error - seedOtherRolePermission', error);
    }
}

const seedPrompt = async () => {
    try {
        const promptJSON = require('../seeders/prompt.json');
        const getDefaults = await Prompt.find({ defaultprompt: true });
        const prompt = [];

        for (const iterator of promptJSON) {
            const check = getDefaults.find((element) => element.title === iterator.title);
            if (check) prompt.push({ updateOne: { filter: { title: iterator.title }, update: { $set: iterator } } })
            else prompt.push({ insertOne: { document: iterator } });
        }
        
        if (prompt.length) await Prompt.bulkWrite(prompt);
        
        logger.info('Default prompt seeded successfully 😴🥳✅')
    } catch (error) {
        logger.error('Error - seedCustomGPT', error);
    }
}

const migrateUser = async () => {
    User.aggregate([
        {
            $lookup: {
                from: "company",
                localField: "invitedBy",
                foreignField: "_id",
                as: "companyDetails"
            }
        },
        {
            $unwind: {
                path: "$companyDetails",
                preserveNullAndEmptyArrays: true
            }      
        },
        {
            $match: {
                roleCode: { $ne: 'COMPANY' },
                company: { $exists: false },
                invitedBy: { $exists: true }    
            }
        }
    ])
    .then(users => {
        users.forEach(user => {
            // Check if companyDetails is defined and has at least one record
            if (user?.companyDetails) {
                const company = {
                    name: user.companyDetails.companyNm,
                    slug: user.companyDetails.slug,
                    id: user.companyDetails._id
                };
                User.updateOne(
                    { _id: user._id },            
                    { $set: { company: company } } 
                )
                .then(() => {
                    console.log(`User ${user.email} updated with company info.`);
                })
                .catch(err => {
                    console.error(`Error updating user ${user._id}:`, err);
                });
            } else {
                console.log(`No company details found for  user ${user.email}.`);
            }
        });
    })
    .catch(err => {
        console.error('Error in aggregation:', err);
    });

}

async function freeWeamApiMigration() {
    try {
        const Company = require('../models/company');
        const CompanyModel = require('../models/userBot');
        const Bot = require('../models/bot');
        const { ANTHROPIC_MODAL } = require('../config/constants/aimodal');

        const companies = await Company.find({}).lean();
        if (!companies.length) {
            return;
        }

        const [huggingface, anthropic, existingBot] = await Promise.all([
            Bot.findOne({ code: 'HUGGING_FACE' }),
            Bot.findOne({ code: 'ANTHROPIC' }),
            CompanyModel.find({'bot.code': { $in: ['HUGGING_FACE', 'ANTHROPIC'] }})
        ])

        const anthropicKey = encryptedData(LINK.WEAM_ANTHROPIC_KEY);
        const huggingfaceKey = encryptedData(LINK.WEAM_HUGGING_FACE_KEY);

        const huggingfaceBaseConfig = {
            text: {
                taskType: 'TEXT_GENERATION',
                apiType: 'OpenAI Compatible API',
                endpoint: 'https://m4en7x13popezxar.us-east-1.aws.endpoints.huggingface.cloud',
                repo: 'meta-llama/Llama-3.2-3B-Instruct',
                context: 8096,
                apikey: huggingfaceKey,
                visionEnable: false
            },
            image: {
                taskType: 'IMAGE_GENERATION',
                apiType: 'OpenAI Compatible API',
                endpoint: 'https://f8nez3o6deqnitvc.us-east-1.aws.endpoints.huggingface.cloud',
                repo: 'sd-community/sdxl-flash',
                apikey: huggingfaceKey,
            },
            extraConfig: {
                sample: false,
                frequencyPenalty: 1,
                topK: 10,
                topP: 0.95,
                typicalP: 0.95,
                repetitionPenalty: 1.03,
                temperature: 0.7,
                stopSequences: ['<|eot_id|>'],
            }
        }

        const constructModelConfig = (name, bot, company, config, extraConfig, modelType, strem = false, tool = false) => ({
            name,
            bot: { title: bot.title, code: bot.code, id: bot._id },
            company: { name: company.companyNm, slug: company.slug, id: company._id },
            config,
            extraConfig,
            modelType,
            ...(strem && { stream: strem }),
            ...(tool && { tool: tool })
        })

        const huggingfacedata = [];
        const anthropicdata = [];

        companies.forEach((company) => {
            // anthropic migration
            ANTHROPIC_MODAL.forEach(element => {
                const modelConfig = constructModelConfig(element.name, anthropic, company, { apikey: anthropicKey }, { stopSequences: [], temperature: 0.7, topK: 0, topP: 0, tools: [] }, element.type);
                const existingModel = existingBot.find((bot) => bot.name === element.name && bot.company.id.toString() === company._id.toString() && bot.bot.code === anthropic.code);
                if (existingModel)
                    anthropicdata.push({
                        updateOne: {
                            filter: { name: element.name, 'company.id': company._id, 'bot.code': anthropic.code },
                            update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                        }
                    });
                else 
                    anthropicdata.push({ insertOne: { document: modelConfig } });
            });
        })

        // // huggingface migration
        companies.forEach((company) => {
            const textModelConfig = constructModelConfig('llama-3-2-3b-instruct-ctq', huggingface, company, huggingfaceBaseConfig.text, huggingfaceBaseConfig.extraConfig, 2, true, true);
            const imageModelConfig = constructModelConfig('sdxl-flash-lgh', huggingface, company, huggingfaceBaseConfig.image, { gScale: 3, numInference: 25 }, 3);

            const existingTextModel = existingBot.find((bot) => bot.name === 'llama-3-2-3b-instruct-ctq' && bot.company.id.toString() === company._id.toString() && bot.bot.code === huggingface.code);
            const existingImageModel = existingBot.find((bot) => bot.name === 'sdxl-flash-lgh' && bot.company.id.toString() === company._id.toString() && bot.bot.code === huggingface.code);   
            if (existingTextModel)
                huggingfacedata.push({ updateOne: { filter: { name: 'llama-3-2-3b-instruct-ctq', 'company.id': company._id, 'bot.code': huggingface.code }, update: { $set: textModelConfig, $unset: { deletedAt: 1 } } } });
            else
                huggingfacedata.push({ insertOne: { document: textModelConfig } });
            if (existingImageModel)
                huggingfacedata.push({ updateOne: { filter: { name: 'sdxl-flash-lgh', 'company.id': company._id, 'bot.code': huggingface.code }, update: { $set: imageModelConfig, $unset: { deletedAt: 1 } } } });
            else
                huggingfacedata.push({ insertOne: { document: imageModelConfig } });

        })

        if (huggingfacedata.length) {
            await CompanyModel.bulkWrite(huggingfacedata);
        }
        if (anthropicdata.length) {
            await CompanyModel.bulkWrite(anthropicdata);
        }

        logger.info('free user api key migration successfully')
    } catch (error) {
        logger.error('Error - freeWeamApiMigration', error);
    }
}

async function botMigration() {
    try {
        const CustomGPT = require('../models/customgpt');
        
        const records = await CustomGPT.aggregate([
            {
                $match: {
                    responseModel: { $exists: true }
                }
            },
            {
                $project: {
                    responseModel: 1
                }
            },
            {
                $lookup: {
                    from: 'companymodel',
                    let: { companyId: '$responseModel.company.id', modelId: '$responseModel.id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$modelId']
                                }
                            }
                        },
                        {
                            $project: { bot: 1 }
                        }
                    ],
                    as: 'model'
                }
            },
            {
                $unwind: '$model'
            }
        ])
        if (!records.length) return
        const updatedRecord = [];
        for (const element of records) {
            updatedRecord.push({
                updateOne: {
                    filter: { _id: element._id },
                    update: { $set: { 'responseModel.bot': element.model.bot } }
                }
            })
        }
        if (updatedRecord.length) {
            await CustomGPT.bulkWrite(updatedRecord)
        }
        logger.info('bot migration done')
    } catch (error) {
        logger.error('Error - botMigration', error);
    }
}

const seedCompanyCountryCode = async () => {
    try {
        const Company = require('../models/company');
        const companyCountryCodeJSON = require('../seeders/companyCountryCode.json');

        const updatedCompanyCountryCode = [];
        for(const currCompany of companyCountryCodeJSON){
        
            updatedCompanyCountryCode.push({
                updateOne: {
                    filter: { _id: currCompany._id },
                    update: { $set: { countryCode: currCompany.shortCode, countryName: currCompany.Countries } }
                }
            })
        }

        if(updatedCompanyCountryCode.length){
           const result = await Company.bulkWrite(updatedCompanyCountryCode);           
        }
        logger.info('Company Country Code seeded successfully');
    } catch (error) {
        logger.error('Error - seedCompanyCountryCode', error);
    }
}

const seedGeneralBrain = async () => {
    try {
      logger.info(`Started the general brain seeder`);
  
      return true;
      //{_id:{$in: [ new mongoose.Types.ObjectId("67ad91df3f4253c7c0f62a10"),new mongoose.Types.ObjectId("67ad8fb88fe45bce747dedf6")]}}
      const workspaces = await Workspace.find({_id:{$in: [ new mongoose.Types.ObjectId("67ad91df3f4253c7c0f62a10"),new mongoose.Types.ObjectId("67ad8fb88fe45bce747dedf6")]}});
      const workspaceUsers = await WorkspaceUser.find();
      const shareBrainsCollection = ShareBrain;
      const brainCollection = Brain;
  
      let count = 0;
      let totalWorkspaceUsers = 0;
      const workspaceUserDontHaveAdmin = [];

      for (const workspace of workspaces) {
        count++
        console.log("current count", count);
        console.log("🚀 ~ seedGeneralBrain ~ workspace:", workspace._id);
        
        const existingBrain = await Brain.findOne({
          workspaceId: workspace._id,
          companyId: workspace.company.id,
          title: "General Brain"
        });
        console.log("🚀 ~ seedGeneralBrain ~ existingBrain:", existingBrain?._id);
  
        if (!existingBrain) {
          
          const adminUser = workspaceUsers.find(
            (user) =>
              user?.workspaceId?.toString() === workspace._id.toString() &&
              (user.role === "ADMIN" || user.role=="COMPANY" || user.role=="MANAGER")
          );
          console.log("🚀 ~ seedGeneralBrain ~ adminUser:", adminUser)
         
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
            console.log("🚀 ~ seedGeneralBrain ~ newBrain: data", newBrain );
            const insertedBrain = await brainCollection.create(newBrain);
  
            console.log("🚀 ~ seedGeneralBrain ~ insertedId:", insertedBrain._id);
            const getBrainDetails = await brainCollection.findOne({_id: insertedBrain._id});
            console.log("🚀 ~ seedGeneralBrain ~ getBrainDetails:", getBrainDetails._id);
  
            for (const currWorkspaceUser of workspaceUsers.filter(u => u?.workspaceId?.toString() === workspace._id.toString())) {
              const shareData = {
                brain: formatBrain(getBrainDetails),
                user: formatUser(currWorkspaceUser.user),
                role: currWorkspaceUser.role === "ADMIN" ? "OWNER" : "MEMBER",
               ...(currWorkspaceUser.teamId && {teamId: currWorkspaceUser.teamId}),
                invitedBy: adminUser.companyId
              };
              console.log("🚀 ~ seedGeneralBrain ~ shareData:", shareData);
              await shareBrainsCollection.create(shareData);
            }
          }
        }
    
        const workspaceUserCount = workspaceUsers.filter(u => 
          u?.workspaceId?.toString() === workspace._id.toString()
        ).length;
        totalWorkspaceUsers += workspaceUserCount;
      }
      console.log("🚀 ~ seedGeneralBrain ~ workspaceUserDontHaveAdmin:", workspaceUserDontHaveAdmin);
      console.log("Total number of workspace users:", totalWorkspaceUsers);
      logger.info(`Ending the general brain seeder. Total workspace users: ${totalWorkspaceUsers}`);
    } catch (error) {
      console.error(`seedGeneralBrain error:`, error);
    }
  };

const seedMigrateBlockedDomains = async () => {
    try {
        const BlockedDomain = require('../models/blockedDomain');
        
        const EXISTING_BLOCKED_DOMAINS = [
            'belgianairways.com',
            'gmail.com',
            'googlemail.com',
            'yahoo.com',
            'outlook.com',
            'mail.com',
            'bitflirt.com',
            'hotmail.com',
            'edu.kg',
            'baldur.edu.kg',
            'aigorithm.space',
            'linux.do',
            'edu.xinjueqio.cn',
            'sdxdlgz.edu.kg',
            'intelligence-technical.xyz',
            'msecth.com',
            'aiera.pro'
        ];

        const operations = EXISTING_BLOCKED_DOMAINS.map(domain => ({
            updateOne: {
                filter: { domain: domain.toLowerCase() },
                update: {
                    $set: {
                        domain: domain.toLowerCase(),
                        reason: 'Migrated from hardcoded list',
                        isActive: true,
                        deletedAt: null
                    }
                },
                upsert: true // This will insert if not exists, update if exists
            }
        }));

        const result = await BlockedDomain.bulkWrite(operations);
        logger.info(`Successfully migrated blocked domains to database ${result.matchedCount} matched, ${result.modifiedCount} modified, ${result.upsertedCount} upserted`);
    } catch (error) {
        logger.error('Error migrating blocked domains:', error);
        throw error;
    }
}

const seedSuperSolutionApps = async () => {
    try {
        const superSolutionJSON = require('../seeders/superSolution.json');
        const existingApps = await SolutionApp.find();

        const bulkApps = [];
        const bulkUpdates = [];

        for (const app of superSolutionJSON.solutionApps) {
            console.log("🚀 ~ seedSuperSolutionApps ~ app:", app)
            const checkExistingApp = existingApps.find(existing => existing.name === app.name);
            if (!checkExistingApp) {
                bulkApps.push({ insertOne: { document: app } });
            } else {
                // Update existing app
                bulkUpdates.push({
                    updateOne: {
                        filter: { name: app.name },
                        update: { $set: app }
                    }
                });
            }
        }

        // Insert new apps
        if (bulkApps.length) {
            await SolutionApp.bulkWrite(bulkApps);
            logger.info(`Super Solution Apps seeded successfully! ${bulkApps.length} new apps added 🚀`);
        }

        // Update existing apps
        if (bulkUpdates.length) {
            await SolutionApp.bulkWrite(bulkUpdates);
            logger.info(`Super Solution Apps updated successfully! ${bulkUpdates.length} existing apps updated 🔄`);
        }

        if (bulkApps.length === 0 && bulkUpdates.length === 0) {
            logger.info('No Super Solution Apps to insert or update! ✅');
        }
    } catch (error) {
        logger.error('Error in seedSuperSolutionApps function ', error);
    }
}

module.exports = {
    seedRole,
    seedAdmin,
    seedEmailTemplate,
    seedCountry,
    seedState,
    seedCity,
    seedNotification,
    seedSetting,
    seedDefaultModel,
    seedCustomGPT,
    seedOtherRolePermission,
    seedPrompt,
    migrateUser,
    freeWeamApiMigration,
    botMigration,
    seedCompanyCountryCode,
    seedMigrateBlockedDomains,
    seedSuperSolutionApps
}
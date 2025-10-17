const Company = require('../models/company');
const User = require('../models/user');
const dbService = require('../utils/dbService');
const { inviteUser } = require('./auth');
const { getTemplate } = require('../utils/renderTemplate');
const { sendSESMail } = require('./email');
const { EMAIL_TEMPLATE, MOMENT_FORMAT, EXPORT_TYPE, ROLE_TYPE, INVITATION_TYPE, JWT_STRING, MODEL_CODE, APPLICATION_ENVIRONMENT } = require('../config/constants/common');
const moment = require('moment-timezone');
const { randomPasswordGenerator, encryptedData, generateRandomToken, genHash, getCompanyId, formatBot } = require('../utils/helper');
const bcrypt = require('bcrypt');
const Role = require('../models/role');
const UserBot = require('../models/userBot');
const { OPENAI_MODAL, AI_MODAL_PROVIDER, PINECORN_STATIC_KEY, MODAL_NAME, ANTHROPIC_MODAL, GEMINI_MODAL, PERPLEXITY_MODAL, OPENROUTER_PROVIDER, DEEPSEEK_MODAL, LLAMA4_MODAL, GROK_MODAL, QWEN_MODAL } = require('../config/constants/aimodal');
const { LINK, API, SERVER, EMAIL } = require('../config/config');
const mongoose = require('mongoose');
const Bot = require('../models/bot');
const { isBlockedDomain, isDisposableEmail } = require('../utils/validations/emailValidation');
const BlockedDomain = require('../models/blockedDomain');
const { addDefaultWorkSpace } = require('./workspace');
const { defaultCompanyBrain } = require('./brain');

const createUser = async(req) => {
    return User.create({
        fname: req.body.fname,
        lname: req.body.lname,
        email: req.body.email,
        password: req.body.password,
        roleId: req.body.roleId,
        roleCode: req.body.roleCode,
        allowuser: req.body.allowuser,
        inviteSts: req.body.inviteSts
    })
}

async function addCompany(req, flag = true) {
    try {
        
        if(SERVER.NODE_ENV === APPLICATION_ENVIRONMENT.PRODUCTION) {
            if(await isBlockedDomain(req.body.email)) {
                throw new Error('This email domain is not allowed');
            }
            if(isDisposableEmail(req.body.email)) {
                throw new Error('Disposable email addresses are not allowed');
            }
        }
   
        const existingEmail = await User.findOne({ email: req.body.email }, { email: 1 });
        if (existingEmail) throw new Error(_localize('module.alreadyExists', req, 'email'));
        const existingCompany = await Company.findOne({ slug: slugify(req.body.companyNm) });
        if (existingCompany) {
            throw new Error(_localize('module.alreadyTaken', req, 'company name'));
        }
        const role = await Role.findOne({ code: ROLE_TYPE.COMPANY }, { code: 1 })
        req.body.roleId = role._id;
        req.body.roleCode = role.code;
        req.body.allowuser = 10 // add temp flag manually billing managment
        req.body.allowuser = 10 // add temp flag manually billing managment
        req.body.inviteSts = INVITATION_TYPE.ACCEPT;
        // const user = flag ? await inviteUser(req) : await createUser(req);
        
        const companyData = {
            slug: slugify(req.body.companyNm),
            ...req.body,
        }
        const company = await Company.create(companyData);
        const companyObj = {
            name: company.companyNm, 
            slug: company.slug, 
            id: company._id
        }
        const user = await User.create({ ...req.body, company: companyObj, msgCredit: 1000 });
        const defaultWorkSpace = await addDefaultWorkSpace(company, user);
        if (defaultWorkSpace) {
            await defaultCompanyBrain(defaultWorkSpace._id, user);
        }
        
        return company;
    } catch (error) {
        handleError(error, 'Error - addCompany');
    }
}

async function checkCompany(req) {
    const result = await Company.findOne({ slug: req.params.slug });
    if (!result) {
        throw new Error(_localize('module.notFound', req, 'company'));
    }
    return result;
}

async function updateCompany(req) {
    try {
        await checkCompany(req);
        return Company.findOneAndUpdate({ slug: req.params.slug }, req.body, { new: true });
    } catch (error) {
        handleError(error, 'Error - updateCompany');
    }
}

async function viewCompany(req) {
    try {
        return checkCompany(req);
    } catch (error) {
        handleError(error, 'Error - viewCompany');
    }
}

async function deleteCompany(req) {
    try {
        await checkCompany(req);
        return Company.deleteOne({ slug: req.params.slug });
    } catch (error) {
        handleError(error, 'Error - deleteCompany');
    }
}

async function getAll(req) {
    try {
        return dbService.getAllDocuments(Company, req.body.query || {}, req.body.options || {});
    } catch (error) {
        handleError(error, 'Error - getAll company')
    }
}

async function partialUpdate(req) {
    try {
        await checkCompany(req);
        return Company.findOneAndUpdate({ slug: req.params.slug }, req.body, { new: true }).select('isActive');
    } catch (error) {
        handleError(error, 'Error - partailUpdate company')
    }
}

const exportCompanies = async (req, fileType) => {
    try {
        req.body.options = {
            pagination: false,
        }

        req.body.query = {
            search: req.query?.search,
            searchColumns: req.query?.searchColumns?.split(','),
        };

        const { data }  = await getAll(req);

        const columns = [
            { header: 'Sr. No.', key: 'srNo' },
            { header: 'Company Name', key: 'companyNm' },
            { header: 'Email', key: 'email' },
            { header: 'Mob No', key: 'mobNo' },
            { header: 'Renew Date', key: 'renewDate' },
            { header: 'Renew Amount', key: 'renewAmt' },
            { header: 'Users', key: 'users' },
            { header: 'Status', key: 'isActive' },
            { header: 'Created', key: 'createdAt' },
        ];

        const result = await Promise.all(data?.map(async (item, index) => {
            const user = await User.findOne({ 'company.id': item._id }, { email: 1, mobNo: 1 });
            return {
                srNo: index + 1,
                companyNm: item.companyNm,
                email: user.email,
                mobNo: user.mobNo,
                renewDate: item.renewDate ? moment(item.renewDate).format(MOMENT_FORMAT) : '-',
                renewAmt: item.renewAmt,
                users: item.users.map(e => e.email).join(','),
                isActive: item.isActive ? 'Active' : 'Deactive',
                createdAt: item.createdAt ? moment(item.createdAt).format(MOMENT_FORMAT) : '-', 
            }
        }))

        const fileName = `company list ${moment().format(MOMENT_FORMAT)}`;

        const workbook = dbService.exportToExcel(EXPORT_TYPE.NAME, columns, result);

        return {
            workbook: workbook,
            fileName: `${fileName}${fileType}`
        }
    } catch (error) {
        handleError(error, 'Error - exportCompanies');
    }
}

const addTeamMembers = async(req) => {
    try {
        const { users } = req.body;
        const emailData = [];

        const bulkOps = await Promise.all(users.map(async (user) => {
            const password = randomPasswordGenerator();
            const data = {
                email: user.email,
                password: await bcrypt.hash(password, 10),
                roleId: user.roleId,
                roleCode: user.roleCode
            }
            emailData.push({ email: user.email, password: password });
            return {
                insertOne: {
                    document: data
                }
            }
        }))
        await User.bulkWrite(bulkOps);

        emailData.forEach((value) => {
            getTemplate(EMAIL_TEMPLATE.ONBOARD_USER, { email: value.email, password: value.password }).then(
                async(template) => {
                    await sendSESMail(value.email, template.subject, template.body);
                }
            )
        })

        return true;
    } catch (error) {
        handleError(error, 'Error - addTeamMembers');
    }
}

const openAIBillingChecker = async (req) => {
    try {
        const billingResponse = await fetch(
            `${LINK.OPEN_AI_API_URL}/v1/chat/completions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${req.body.key}`,
                },
                body: JSON.stringify({
                    model: MODAL_NAME.GPT_4_1,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant.',
                        },
                        {
                            role: 'user',
                            content: 'Hello!',
                        },
                    ],
                }),
            }
        );
        if (!billingResponse.ok) throw new Error(_localize('ai.open_ai_billing_error', req));
    } catch (error) {
        handleError(error, 'Error - openAIBillingChecker');
    }
}

async function aiModalCreation(req) {
    console.log("req body", req.body)
    try {
        let companyId, companydetails;
        if (req.roleCode === ROLE_TYPE.COMPANY) {
            companyId = req.user.company.id;
            companydetails = req.user.company
        } else {
            companyId = req.user.invitedBy;
            const getCompany = await Company.findById({ _id: companyId }, { companyNm: 1, slug: 1 });
            companydetails = { name: getCompany.companyNm, slug: getCompany.slug, id: getCompany._id };
        }
        const existing = await UserBot.find({ 'company.id': companyId, 'bot.code': req.body.bot.code });
        const modalMap = OPENAI_MODAL.reduce((map, val) => {
            map[val.name] = val.type;
            return map;
        }, {});

        const updates = [];
        const inserts = [];
        for (const [key, value] of Object.entries(modalMap)) {
            const existingEntry = existing.find(entry => entry.name === key);
            const modelConfig = {
                bot: req.body.bot,
                company: companydetails,
                name: key,
                config: {
                    apikey: encryptedData(req.body.key),
                },
            };
            if (modalMap.hasOwnProperty(key)) {
                if (value === 1) {
                    modelConfig['modelType'] = value;
                    modelConfig['dimensions'] = 1536;
                }
                else{
                    if ([MODAL_NAME.GPT_O1, MODAL_NAME.GPT_O1_MINI, MODAL_NAME.GPT_O1_PREVIEW, MODAL_NAME.GPT_O3_MINI, MODAL_NAME.GPT_4_1, MODAL_NAME.GPT_4_1_MINI, MODAL_NAME.GPT_4_1_NANO, MODAL_NAME.O4_MINI, MODAL_NAME.O3, MODAL_NAME.CHATGPT_4O_LATEST].includes(key)) {
                        modelConfig['extraConfig'] = {
                            temperature: 1
                        }
                    }
                    modelConfig['modelType'] = value;
                }
            }

            if (existingEntry)
                updates.push({
                    updateOne: {
                        filter: { name: key, 'company.id': companyId, 'bot.code': req.body.bot.code },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else inserts.push(modelConfig);
        }

        if(updates.length){
            await UserBot.bulkWrite(updates)
        }

        if(inserts.length){
            return UserBot.insertMany(inserts)
        }
        
        return existing;
    } catch (error) {
        handleError(error, 'Error - aiModalCreation');
    }
}

async function openAIApiChecker(req) {
    try {
        const companyId = getCompanyId(req.user);
        
        const response = await fetch(LINK.OPEN_AI_MODAL, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${req.body.key}`
            }
        });
        
        const jsonData = await response.json();
        if (!response.ok) {
            return jsonData;
        }
        const { data } = jsonData;
        const companydetails = req.user.company;
        const [openAiBot, existing] = await Promise.all([
            Bot.findOne({ code: AI_MODAL_PROVIDER.OPEN_AI }, { title: 1, code: 1 }),
            UserBot.find({ 'company.id': companyId, 'bot.code': AI_MODAL_PROVIDER.OPEN_AI })
        ]);
        // diffrentiate between embedding and chat models
        const modalMap = OPENAI_MODAL.reduce((map, val) => {
            map[val.name] = val.type;
            return map;
        }, {});

        const updates = [];
        const inserts = [];
        const encryptedKey = encryptedData(req.body.key);

        for (const model of data) {
            if (!modalMap.hasOwnProperty(model.id)) continue;
            const existingEntry = existing.find(entry => entry.name === model.id);
            const modelConfig = {
                bot: formatBot(openAiBot),
                company: companydetails,
                name: model.id,
                config: {
                    apikey: encryptedKey,
                }
            }
            if (modalMap[model.id] === 1) {
                modelConfig['modelType'] = modalMap[model.id];
                modelConfig['dimensions'] = 1536;
            }
            else {
                if ([MODAL_NAME.GPT_4_1, MODAL_NAME.GPT_4_1_MINI, MODAL_NAME.GPT_4_1_NANO, MODAL_NAME.O4_MINI, MODAL_NAME.O3, MODAL_NAME.CHATGPT_4O_LATEST].includes(model.id)) {
                    modelConfig['extraConfig'] = {
                        temperature: 1
                    }
                }
                modelConfig['modelType'] = modalMap[model.id];
            }

            if (existingEntry)
                updates.push({
                    updateOne: {
                        filter: { name: model.id, 'company.id': companyId, 'bot.code': AI_MODAL_PROVIDER.OPEN_AI },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else inserts.push(modelConfig);
            
        }

        if(updates.length){
            await UserBot.bulkWrite(updates)
        }

        if(inserts.length){
            return UserBot.insertMany(inserts)
        }
        
        return existing;
    } catch (error) {
        handleError(error, 'Error - openAIApiChecker');
    }
}


const checkApiKey = async (req) => {
     try {
        const { code } = req.body;

        const providerObj = {
            [AI_MODAL_PROVIDER.OPEN_AI]: openAIApiChecker,
            [AI_MODAL_PROVIDER.ANTHROPIC]: anthropicApiChecker,
            [AI_MODAL_PROVIDER.GEMINI]: geminiApiKeyChecker,
            [AI_MODAL_PROVIDER.PERPLEXITY]: perplexityApiChecker,
            [AI_MODAL_PROVIDER.OPEN_ROUTER]: openRouterApiChecker,
        }
        const provider = await providerObj[code](req);
        return provider;
       
    } catch (error) {
        handleError(error, 'Error - checkApiKey');
    }
    // try {

    //     const companyId = getCompanyId(req.user);
       
    //     const response = await fetch(LINK.OPEN_AI_MODAL, {
    //         method: 'GET',
    //         headers: {
    //             Authorization: `Bearer ${req.body.key}`
    //         }
    //     });
        
    //     const data = await response.json();
    //     if (!response.ok) {
    //         return data;
    //     }
        
    //     await Promise.all([
    //         Company.updateOne({ _id: companyId }, { $unset: { [`queryLimit.${AI_MODAL_PROVIDER.OPEN_AI}`]: '' }}),
    //         openAIBillingChecker(req),
    //     ])

    //     return aiModalCreation(req);
    // } catch (error) {
    //     handleError(error, 'Error - checkApiKey');
    // }
};

const resendVerification = async (req) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email }); 
        if (!existingUser) throw new Error(_localize('auth.link_expire', req, 'verification'));
        const inviteLink = await createVerifyLink(existingUser, {}, req.body.minutes);
        getTemplate(EMAIL_TEMPLATE.RESEND_VERIFICATION_LINK, { link: inviteLink, support: EMAIL?.SENDER_EMAIL }).then(
            async(template) => {
                await sendSESMail(existingUser.email, template.subject, template.body);
            }
        )
        return true;
    } catch (error) {
        handleError(error, 'Error - resendVerification');
    }
}

const createVerifyLink = async (user, payload, expireTime = 60) => {
    try {
        const inviteHash = `invite?token=${generateRandomToken()}&hash=${genHash()}`;
        const inviteLink = `${LINK.FRONT_URL}/${inviteHash}`;
        const sysdate = convertToTz();
        const linkExpiresTime = moment(sysdate).add(expireTime, 'minutes').format(MOMENT_FORMAT);
        await User.updateOne({ _id: user._id }, {
            $set: {
                ...payload,
                inviteSts: INVITATION_TYPE.PENDING,
                inviteLink: inviteHash,
                inviteExpireOn: linkExpiresTime
            }
        });
        return inviteLink;
    } catch (error) {
        handleError(error, 'Error - resendVerification');   
    }
}

async function createPinecornIndex(user, req) {
    try {
        const { ensureIndex } = require('./pinecone');
        
        // Create Pinecone index directly using the new service
        await ensureIndex(user.company.id, 1536);
        
        // Store metadata in MongoDB for reference
        const data = mongoose.connection;
        const result = data.db.collection('companypinecone');
        await result.insertOne({
            company: {
                name: user.company.name,
                slug: user.company.slug,
                id: user.company.id
            },
            vector_index: user.company.id,
            dimensions: 1536,
            environment: 'us-west-2',
            metric: 'cosine',
            cloud: 'aws',
            region: 'us-west-2'
        });

        // Set up OpenAI bot if available
        const openAiBot = await Bot.findOne({ code: AI_MODAL_PROVIDER.OPEN_AI }, { title: 1, code: 1 });
        if (openAiBot) {
            req.body = {
                ...req.body,
                bot: {
                    id: openAiBot._id,
                    title: openAiBot.title,
                    code: openAiBot.code,
                },
                key: LINK.WEAM_OPEN_AI_KEY,
            };
            req.user = user;
            req.roleCode = user.roleCode
            await aiModalCreation(req);
        }

        await createFreeTierApiKey(user);
        
        logger.info(`Pinecone index created successfully for company: ${user.company.id}`);
    } catch (error) {
        console.log("🚀 ~ createPinecornIndex ~ error:", error)
        handleError(error, 'Error - createPinecornIndex'); 
    }
}

async function huggingFaceApiChecker(req) {
    try {
        const { user, body } = req;
        const companyId = getCompanyId(user);
        const { name, bot, repo, key, context } = body;

        const token = extractAuthToken(req);
        const response = await fetch(`${LINK.PYTHON_API_URL}${API.PREFIX}/validateEndpoint/validate-huggingface-endpoint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `${JWT_STRING}${token}`,
                Origin: LINK.FRONT_URL
            },
            body: JSON.stringify({
                token: key,
                model_repository: repo,
                model_name: name,
                context_length: context
            })
        })

        logger.info(`validate-huggingface-endpoint return ${response.status}`);

        const responseData = await response.json();
        if (!responseData.data) throw new Error(responseData.messages);

        const existingBot = await UserBot.findOne({
            'company.id': companyId,
            'bot.code': bot.code,
            name
        });

        const companyInfo = existingBot ? null : await Company.findById(
            companyId,
            { companyNm: 1, slug: 1 }
        );
        const commonPayload = createCommonBotPayload(body, companyInfo);

        if (existingBot) {
            if (existingBot.deletedAt) {
                const updatedBot = await UserBot.findOneAndUpdate(
                    { _id: existingBot._id },
                    {
                        ...commonPayload, 
                        $unset: { deletedAt: 1 } 
                    },
                    { new: true }
                );
                return updatedBot;
            }
            await Promise.all([
                Company.updateOne({ _id: companyId }, { $unset: { [`queryLimit.${AI_MODAL_PROVIDER.HUGGING_FACE}`]: '' }}),
                UserBot.updateOne({ _id: existingBot._id }, { $set: createCommonBotPayload(body, null) })
            ])
            return true;
        }
        

        return UserBot.create(commonPayload);
    } catch (error) {
        handleError(error, 'Error - huggingFaceApiChecker')
    }
}

const TASK_CODE = {
    TEXT_GENERATION: 'TEXT_GENERATION',
    IMAGE_GENERATION: 'IMAGE_GENERATION'
}

function createCommonBotPayload(body, companyInfo = null) {
    const { name, tool, bot, taskType, apiType, description, endpoint, repo, context, key, sample, frequencyPenalty, topK, topP, typicalP, repetitionPenalty, temperature, sequences,numInference,gScale } = body;

    const stopSequences = sequences ? [sequences] : ['<|eot_id|>'];
    const config = {
        taskType,
        apiType,
        endpoint,
        repo,
        apikey: encryptedData(key),
        ...(description && { description }),
        ...(taskType === TASK_CODE.TEXT_GENERATION && { context })
    };

    const payload = {
        name,
        config,
        extraConfig: taskType === TASK_CODE.TEXT_GENERATION ? { sample, frequencyPenalty, topK, topP, typicalP, repetitionPenalty, temperature, stopSequences } : { numInference, gScale },
        ...(companyInfo && {
            bot,
            company: {
                name: companyInfo.companyNm,
                slug: companyInfo.slug,
                id: companyInfo._id,
            },
        }),
        ...(taskType === TASK_CODE.IMAGE_GENERATION  && {
            modelType : 3
        }),
        ...(taskType === TASK_CODE.TEXT_GENERATION && {
            modelType : 2,
            visionEnable: false,
            tool: tool,
            stream: true
        })
    };

    return payload;
}

function extractAuthToken(req) {
    return req.headers['authorization']?.split(JWT_STRING)[1];
}

async function anthropicApiChecker(req) {
    try {
        const response = await fetch(`${LINK.ANTHROPIC_AI_API_URL}/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': req.body.key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: MODAL_NAME.CLAUDE_SONNET_4_20250514,
                max_tokens: 1024,
                messages: [
                    { role: 'user', content: 'Hello, world' }
                ]
            })
        });
        if (!response.ok) return false;
        const companyId = getCompanyId(req.user);
        const companydetails = req.user.company;

        const [existingBots, anthropicBot] = await Promise.all([
            UserBot.find({ 'company.id': companyId, 'bot.code': AI_MODAL_PROVIDER.ANTHROPIC }),
            Bot.findOne({ code: AI_MODAL_PROVIDER.ANTHROPIC }, { title: 1, code: 1 })
        ]);

        const updates = [];
        const inserts = [];
        const encryptedKey = encryptedData(req.body.key);

        ANTHROPIC_MODAL.forEach(element => {
            const existingBot = existingBots.find(bot => bot.name === element.name);
            const modelConfig = {
                name: element.name,
                bot: formatBot(anthropicBot),
                company: companydetails,
                config: { apikey: encryptedKey },
                modelType: element.type,
                extraConfig: {
                    stopSequences: [],
                    temperature: 0.7,
                    topK: 0,
                    topP: 0,
                    tools: []
                }
            };
            if (existingBot)
                updates.push({
                    updateOne: {
                        filter: { name: element.name, 'company.id': companyId, 'bot.code': AI_MODAL_PROVIDER.ANTHROPIC },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else 
                inserts.push(modelConfig);
        });

        if (updates.length) await UserBot.bulkWrite(updates);

        if (inserts.length) return UserBot.insertMany(inserts);

        return existingBots[0]?.deletedAt ? existingBots : true;
    } catch (error) {
        handleError(error, 'Error - anthropicApiChecker');
    }
}


async function createFreeTierApiKey(user) {
    try {
        const companyId = getCompanyId(user);
        const company = await Company.findById(companyId).lean();
        if (!company) return;

        const [huggingface, anthropic, gemini, perplexity, deepseek, llama4, grok, qwen, existingBot] = await Promise.all([
            Bot.findOne({ code: MODEL_CODE.HUGGING_FACE }),
            Bot.findOne({ code: MODEL_CODE.ANTHROPIC }),
            Bot.findOne({ code: MODEL_CODE.GEMINI }),
            Bot.findOne({ code: MODEL_CODE.PERPLEXITY }),
            Bot.findOne({ code: MODEL_CODE.DEEPSEEK }),
            Bot.findOne({ code: MODEL_CODE.LLAMA4 }),
            Bot.findOne({ code: MODEL_CODE.GROK }),
            Bot.findOne({ code: MODEL_CODE.QWEN }),
            UserBot.find({ 'bot.code': { $in: [MODEL_CODE.HUGGING_FACE, MODEL_CODE.ANTHROPIC, MODEL_CODE.GEMINI, MODEL_CODE.PERPLEXITY, MODEL_CODE.DEEPSEEK, MODEL_CODE.LLAMA4, MODEL_CODE.GROK, MODEL_CODE.QWEN] } })
        ])

        const anthropicKey = encryptedData(LINK.WEAM_ANTHROPIC_KEY);
        const huggingfaceKey = encryptedData(LINK.WEAM_HUGGING_FACE_KEY);
        const geminiKey = encryptedData(LINK.WEAM_GEMINI_KEY);
        // const perplexityKey = encryptedData(LINK.WEAM_PERPLEXITY_KEY);
        const deepseekKey = encryptedData(LINK.WEAM_DEEPSEEK_KEY);
        const llama4Key = encryptedData(LINK.WEAM_LLAMA4_KEY);
        const grokKey = encryptedData(LINK.WEAM_GROK_KEY);
        const qwenKey = encryptedData(LINK.WEAM_QWEN_KEY);
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

        const constructModelConfig = (name, bot, company, config, extraConfig, modelType, strem = false, tool = false, provider = null) => ({
            name,
            bot: { title: bot.title, code: bot.code, id: bot._id },
            company: { name: company.companyNm, slug: company.slug, id: company._id },
            config,
            extraConfig,
            modelType,
            ...(provider && { provider }),
            ...(strem && { stream: strem }),
            ...(tool && { tool: tool })
        })

        const huggingfacedata = [];
        const anthropicdata = [];
        const geminidata = [];
        const perplexitydata = [];
        const deepseekdata = [];
        const llama4data = [];
        const grokdata = [];
        const qwendata = [];
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

        GEMINI_MODAL.forEach(element => {
            const modelConfig = constructModelConfig(element.name, gemini, company, { apikey: geminiKey }, { stopSequences: [], temperature: 0.7, topK: 10, topP: 0.9, tools: [] }, element.type);
            const existingModel = existingBot.find((bot) => bot.name === element.name && bot.company.id.toString() === company._id.toString() && bot.bot.code === gemini.code);
            if (existingModel)
                geminidata.push({
                    updateOne: {
                        filter: { name: element.name, 'company.id': company._id, 'bot.code': gemini.code },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else 
                geminidata.push({ insertOne: { document: modelConfig } });
        });

        // PERPLEXITY_MODAL.forEach(element => {
        //     const modelConfig = constructModelConfig(element.name, perplexity, company, { apikey: perplexityKey }, { temperature : 0.7, topP : 0.9, topK : 10, stream : true}, element.type);
        //     const existingModel = existingBot.find((bot) => bot.name === element.name && bot.company.id.toString() === company._id.toString() && bot.bot.code === perplexity.code);

        //     if (existingModel)
        //         perplexitydata.push({
        //             updateOne: {
        //                 filter: { name: element.name, 'company.id': company._id, 'bot.code': perplexity.code },
        //                 update: { $set: modelConfig, $unset: { deletedAt: 1 } }
        //             }
        //         });
        //     else
        //         perplexitydata.push({ insertOne: { document: modelConfig } });
        // });

        DEEPSEEK_MODAL.forEach(element => {
            const modelConfig = constructModelConfig(element.name, deepseek, company, { apikey: deepseekKey }, { temperature : 0.7, topP : 0.9, topK : 10, stream : true}, element.type, false, false, OPENROUTER_PROVIDER.DEEPSEEK);
            const existingModel = existingBot.find((bot) => bot.name === element.name && bot.company.id.toString() === company._id.toString() && bot.bot.code === deepseek.code);

            if (existingModel)
                deepseekdata.push({
                    updateOne: {
                        filter: { name: element.name, 'company.id': company._id, 'bot.code': deepseek.code },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else
                deepseekdata.push({ insertOne: { document: modelConfig } });
        });

        LLAMA4_MODAL.forEach(element => {
            const modelConfig = constructModelConfig(element.name, llama4, company, { apikey: llama4Key }, { temperature : 0.7, topP : 0.9, topK : 10, stream : true}, element.type, false, false, OPENROUTER_PROVIDER.LLAMA4);
            const existingModel = existingBot.find((bot) => bot.name === element.name && bot.company.id.toString() === company._id.toString() && bot.bot.code === llama4.code);

            if (existingModel)
                llama4data.push({
                    updateOne: {
                        filter: { name: element.name, 'company.id': company._id, 'bot.code': llama4.code },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else
                llama4data.push({ insertOne: { document: modelConfig } });
        });

        GROK_MODAL.forEach(element => {
            const modelConfig = constructModelConfig(element.name, grok, company, { apikey: grokKey }, { temperature : 0.7, topP : 0.9, topK : 10, stream : true}, element.type, false, false, OPENROUTER_PROVIDER.GROK);
            const existingModel = existingBot.find((bot) => bot.name === element.name && bot.company.id.toString() === company._id.toString() && bot.bot.code === grok.code);

            if (existingModel)
                grokdata.push({
                    updateOne: {
                        filter: { name: element.name, 'company.id': company._id, 'bot.code': grok.code },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else
            grokdata.push({ insertOne: { document: modelConfig } });
        });

        QWEN_MODAL.forEach(element => {
            const modelConfig = constructModelConfig(element.name, qwen, company, { apikey: qwenKey }, { temperature : 0.7, topP : 0.9, topK : 10, stream : true}, element.type, false, false, OPENROUTER_PROVIDER.QWEN);
            const existingModel = existingBot.find((bot) => bot.name === element.name && bot.company.id.toString() === company._id.toString() && bot.bot.code === qwen.code);

            if (existingModel)
                qwendata.push({
                    updateOne: {
                        filter: { name: element.name, 'company.id': company._id, 'bot.code': qwen.code },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else
            qwendata.push({ insertOne: { document: modelConfig } });
        });
     
            // huggingface migration
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

        // if (huggingfacedata.length) {
        //     await UserBot.bulkWrite(huggingfacedata);
        // }
        if (anthropicdata.length) {
            await UserBot.bulkWrite(anthropicdata);
        }
        if (geminidata.length) {
            await UserBot.bulkWrite(geminidata);
        }
        if (perplexitydata.length) {
            await UserBot.bulkWrite(perplexitydata);
        }
        if (deepseekdata.length) {
            await UserBot.bulkWrite(deepseekdata);
        }
        if (llama4data.length) {
            await UserBot.bulkWrite(llama4data);
        }
        if (grokdata.length) {
            await UserBot.bulkWrite(grokdata);
        }
        if (qwendata.length) {
            await UserBot.bulkWrite(qwendata);
        }
    } catch (error) {
        handleError(error, 'Error - createFreeTierApiKey');
    }
}

async function createGeminiModels(req) {
    try {
        const companydetails = req.user.company;
        const companyId = companydetails.id;

        const [geminiBot, existing] = await Promise.all([
            Bot.findOne({ code: AI_MODAL_PROVIDER.GEMINI }, { title: 1, code: 1 }),
            UserBot.find({ 'company.id': companyId, 'bot.code': AI_MODAL_PROVIDER.GEMINI })
        ]);

        const updates = [];
        const inserts = [];
        const encryptedKey = encryptedData(req.body.key);

        GEMINI_MODAL.forEach(element => {
            const existingEntry = existing.find(entry => entry.name === element.name);
            const modelConfig = {
                name: element.name,
                bot: formatBot(geminiBot),
                company: companydetails,
                config: {
                    apikey: encryptedKey,
                },
                modelType: 2,
                isActive: true,
                extraConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 10
                }
            };
            if (existingEntry) {
                updates.push({
                    updateOne: {
                        filter: { name: element.name, 'company.id': companyId, 'bot.code': AI_MODAL_PROVIDER.GEMINI },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            } else {
                inserts.push(modelConfig);
            }
        });
        
        if (updates.length) {
            return UserBot.bulkWrite(updates);
        }

        if (inserts.length) {
            return UserBot.insertMany(inserts);
        }

        return existing;
    } catch (error) {
        handleError(error, 'Error - createGeminiModels');
    }
}

async function geminiApiKeyChecker(req) {
    try {
        const response = await fetch(
            `${LINK.GEMINI_API_URL}/v1beta/models/gemini-2.0-flash:generateContent?key=${req.body.key}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        system_instruction: {
                            parts: [
                                {
                                    text: 'You are a cat. Your name is Neko.'
                                }
                            ]
                        },
                        contents: [
                            {
                                parts: [
                                    {
                                        text: 'Hello there'
                                    }
                                ]
                            }
                        ]
                    }
                )
            }
        );
        if (!response.ok) {
            return false;
        }
        return createGeminiModels(req);
    } catch (error) {
        handleError(error, 'Error - geminiApiKeyChecker');
    }
}

const sendManualInviteEmail = async (req) => {
    try {
        const { email, minutes} = req.body;
        const existingUser = await User.find({ email: { $in: email } }, { email: 1 }); 
        if (!existingUser.length) throw new Error(_localize('module.notFound', req, 'user'));
        const emailPromise = [];
        existingUser.forEach(async (user) => {
            const inviteLink = await createVerifyLink(user, {}, minutes);
            emailPromise.push(getTemplate(EMAIL_TEMPLATE.VERIFICATION_LINK, { link: inviteLink, support: EMAIL?.SENDER_EMAIL }).then(
                async(template) => {
                    await sendSESMail(user.email, template.subject, template.body);
                }
            ));
        });
        Promise.all(emailPromise);
        return true; 
    } catch (error) {
        handleError(error, 'Error - sendManualInviteEmail');
    }
}


const addBlockedDomain = async (req) => {
    try {
        const { domain, reason, isActive } = req.body;
        const blockedDomain = await BlockedDomain.findOneAndUpdate({ domain }, { $set: { domain, reason, isActive } }, { new  : true, upsert: true });
        return blockedDomain;
    } catch (error) {
        handleError(error, 'Error - addBlockedDomain');     
    }
}

async function perplexityApiChecker(req) {
    try {
        const companyId = getCompanyId(req.user);
        const companydetails = req.user.company;
        const response = await fetch(`${LINK.PERPLEXITY_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.body.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODAL_NAME.SONAR,
                messages: [
                    {
                        role: 'system',
                        content: 'Be precise and concise.'
                    },
                    {
                        role: 'user',
                        content: 'How many stars are there in our galaxy?'
                    }
                ]
            })
        });
        if (!response.ok) return false
        const [perplexityBot, existing] = await Promise.all([
            Bot.findOne({ code: AI_MODAL_PROVIDER.PERPLEXITY }, { title: 1, code: 1 }),
            UserBot.find({ 'company.id': companyId, 'bot.code': AI_MODAL_PROVIDER.PERPLEXITY })
        ]);
        const updates = [];
        const inserts = [];
        const encryptedKey = encryptedData(req.body.key);

        PERPLEXITY_MODAL.forEach(element => {
            const existingBot = existing.find(bot => bot.name === element.name);
            const modelConfig = {
                name: element.name,
                bot: formatBot(perplexityBot),
                company: companydetails,
                config: {
                    apikey: encryptedKey,
                },
                modelType: element.type,
                isActive: true,
                extraConfig: {
                    stream: true,
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 10
                }
            };
            if (existingBot)
                updates.push({
                    updateOne: {
                        filter: { name: element.name, 'company.id': companyId, 'bot.code': AI_MODAL_PROVIDER.PERPLEXITY },
                        update: { $set: modelConfig, $unset: { deletedAt: 1 } }
                    }
                });
            else inserts.push(modelConfig);
        });
        if (updates.length) {
            return UserBot.bulkWrite(updates);
        }

        if (inserts.length) {
            return UserBot.insertMany(inserts);
        }

        return existing;
    } catch (error) {
        handleError(error, 'Error - perplexityApiChecker');
    }
}

async function openRouterApiChecker(req) {
    try {
        const companyId = getCompanyId(req.user);
        const companydetails = req.user.company;
        const response = await fetch(`${LINK.OPEN_ROUTER_API_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.body.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODAL_NAME.GPT_4O_MINI,
                messages: [
                    { role: 'user', content: 'What is the meaning of life?' }
                ]
            })
        });
        console.log('openRouterApiChecker',response.status);
        if (!response.ok) return false;
        const query = Object.keys(OPENROUTER_PROVIDER);
        const [openRouterBot, existing] = await Promise.all([
            Bot.find({ code: { $in: query } }, { title: 1, code: 1 }),
            UserBot.find({ 'company.id': companyId, 'bot.code': { $in: query } })
        ]);
        const updates = [];
        const inserts = [];
        const encryptedKey = encryptedData(req.body.key);
        const commonConfig = {
            company: companydetails,
            config: {
                apikey: encryptedKey,
            },
            isActive: true,
            extraConfig: {
                stream: true,
                temperature: 0.7,
                topP: 0.9,
                topK: 10
            },
        }
        const processModalBots = (modalList, providerKey, providerName) => {
            const botMeta = openRouterBot.find(bot => bot.code === providerKey);
            modalList.forEach((element) => {
                const existingBot = existing.find(bot => bot.name === element.name);
                const modelConfig = {
                    name: element.name,
                    bot: formatBot(botMeta),
                    modelType: element.type,
                    provider: providerName,
                    ...commonConfig,
                };
                if (existingBot) {
                    updates.push({
                        updateOne: {
                            filter: {
                                name: element.name,
                                'company.id': companyId,
                                'bot.code': providerKey
                            },
                            update: {
                                $set: modelConfig,
                                $unset: { deletedAt: 1 }
                            }
                        }
                    });
                } else {
                    inserts.push(modelConfig);
                }
            });
        };
        processModalBots(DEEPSEEK_MODAL, AI_MODAL_PROVIDER.DEEPSEEK, OPENROUTER_PROVIDER.DEEPSEEK);
        processModalBots(LLAMA4_MODAL, AI_MODAL_PROVIDER.LLAMA4, OPENROUTER_PROVIDER.LLAMA4);
        processModalBots(QWEN_MODAL, AI_MODAL_PROVIDER.QWEN, OPENROUTER_PROVIDER.QWEN);
        processModalBots(GROK_MODAL, AI_MODAL_PROVIDER.GROK, OPENROUTER_PROVIDER.GROK);
        if (updates.length) {
            return UserBot.bulkWrite(updates);
        }
        if (inserts.length) {
            return UserBot.insertMany(inserts);
        }
        return existing;
    } catch (error) {
        handleError(error, 'Error - openRouterApiChecker');
    }
}

const migrateCompanyModels = async (req) => {
    try {
        const { models, code, api_key, model_type = 2, extra_config } = req.body;
        
        const Company = require('../models/company');
        const UserBot = require('../models/userBot');
        const Bot = require('../models/bot');
        
        const currentDateTime = new Date();
        const modelsToAdd = models;
        const updatedCompanies = [];
        let totalMigratedCount = 0;

        // Find the model/bot data
        const modelData = await Bot.findOne({ code }, { _id: 1, title: 1, code: 1 });
        if (!modelData) {
            throw new Error('Model Data not found.');
        }
        
        const botData = {
            title: modelData.title,
            code: modelData.code,
            id: modelData._id
        };

        // Get all companies from the collection
        const companies = await Company.find({});
        
        for (const company of companies) {
            const companyId = company._id;
            const companyName = company.companyNm;
            const modelsInserted = [];
            
            for (const modelName of modelsToAdd) {
                const existingRecord = await UserBot.findOne({ 
                    name: modelName, 
                    'company.id': companyId 
                });

                // If the model does not exist, insert it
                if (!existingRecord) {
                    const newRecord = {
                        name: modelName,
                        bot: botData,
                        company: {
                            name: companyName,
                            slug: company.slug,
                            id: companyId
                        },
                        config: { apikey: api_key },
                        modelType: model_type,
                        isActive: true,
                        extraConfig: extra_config || {},
                        createdAt: currentDateTime,
                        updatedAt: currentDateTime
                    };

                    // Insert the new model into the companymodel collection
                    await UserBot.create(newRecord);
                    modelsInserted.push(modelName);
                }
            }

            // Check if any models were inserted for this company
            if (modelsInserted.length > 0) {
                updatedCompanies.push({
                    companyName: companyName,
                    modelsInserted: modelsInserted,
                    totalModelsInserted: modelsInserted.length
                });
                totalMigratedCount += 1;
                logger.info(`Inserted ${modelsInserted.length} models for company ${companyName}.`);
            } else {
                logger.info(`No models inserted for company ${companyName}.`);
            }
        }

        // Check if any companies were updated
        if (totalMigratedCount > 0) {
            logger.info(`Total companies migrated: ${totalMigratedCount}.`);
        } else {
            logger.warning('No companies were migrated.');
        }

        return {
            message: 'Migration Companymodel completed successfully.',
            totalMigratedCount: totalMigratedCount,
            updatedCompanies: updatedCompanies
        };
    } catch (error) {
        handleError(error, 'Error - migrateCompanyModels');
    }
}

module.exports = {
    addCompany,
    updateCompany,
    deleteCompany,
    viewCompany,
    getAll,
    partialUpdate,
    exportCompanies,
    addTeamMembers,
    checkApiKey,
    resendVerification,
    createPinecornIndex,
    huggingFaceApiChecker,
    extractAuthToken,
    anthropicApiChecker,
    createFreeTierApiKey,
    geminiApiKeyChecker,
    sendManualInviteEmail,
    addBlockedDomain,
    migrateCompanyModels    
}


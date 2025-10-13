const seedService = require('../services/seeder');

async function initSeed () {
    try {
        await seedService.seedEmailTemplate();
        await seedService.seedRole();
        await seedService.seedAdmin();
        await seedService.seedNotification();
        await seedService.seedSetting();
        await seedService.seedDefaultModel();
        await seedService.seedCustomGPT();
        await seedService.seedPrompt();
        await seedService.seedOtherRolePermission();
        await seedService.seedCountry();  
        await seedService.seedSuperSolutionApps();            
    } catch (error) {
        throw error; // Re-throw to ensure the application startup fails if seeding fails
    }
}

module.exports = initSeed;
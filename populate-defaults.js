module.exports = async ({ strapi }) => {
    try {
        // console.log('Populating default values for advisor-registration-page...');

        // Find the existing entry
        let entry = await strapi.db.query('api::advisor-registration-page.advisor-registration-page').findOne({});

        const defaultData = {
            heroTitle: "Become a Partner",
            heroSubtitle: "Join Scalex Finance and start earning commissions",
            step1Label: "Basic Info",
            step2Label: "Professional",
            step3Label: "Payout",
            fullNameLabel: "Full Name",
            fullNamePlaceholder: "John Doe",
            emailLabel: "Email Address",
            emailPlaceholder: "john@example.com",
            phoneNumberLabel: "Phone Number",
            phoneNumberPlaceholder: "+91 98765 43210",
            passwordLabel: "Create Password",
            passwordPlaceholder: "********",
            stateLabel: "State",
            statePlaceholder: "Maharashtra",
            districtLabel: "District",
            districtPlaceholder: "Mumbai",
            pinCodeLabel: "Pin Code",
            pinCodePlaceholder: "400001",
            licenseLabel: "Professional License (Optional)",
            licensePlaceholder: "CA/CS/ARN Number",
            panLabel: "PAN Number",
            panPlaceholder: "ABCDE1234F",
            specializationLabel: "Specialization",
            specializationOptions: "Lending,Wealth Management,Insurance",
            payoutAlertText: "We need your bank details to process your commission payouts. You can update this later.",
            bankAccountLabel: "Bank Account Number",
            bankAccountPlaceholder: "1234567890",
            ifscLabel: "IFSC Code",
            ifscPlaceholder: "HDFC0001234",
            bankNameLabel: "Bank Name",
            bankNamePlaceholder: "HDFC Bank",
            nextButtonText: "Next Step",
            backButtonText: "Back",
            submitButtonText: "Submit Application",
            signInPromptText: "Already have an account?",
            signInLinkText: "Sign in",
            successTitle: "Registration Successful!",
            successMessage: "Welcome! Our team will review your application shortly.",
            returnHomeButtonText: "Return Home"
        };

        if (entry) {
            // Update existing entry with defaults for any null/undefined fields
            // console.log('Updating existing entry with default values...');
            await strapi.db.query('api::advisor-registration-page.advisor-registration-page').update({
                where: { id: entry.id },
                data: defaultData
            });
            // console.log('✓ Successfully updated advisor-registration-page with all default values!');
        } else {
            // Create new entry with defaults
            // console.log('Creating new entry with default values...');
            await strapi.db.query('api::advisor-registration-page.advisor-registration-page').create({
                data: defaultData
            });
            // console.log('✓ Successfully created advisor-registration-page with all default values!');
        }

    } catch (error) {
        // console.error('Error:', error.message);
    }
};

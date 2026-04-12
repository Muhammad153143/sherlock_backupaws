const SibApiV3Sdk = require('sib-api-v3-sdk');

/**
 * Send email using Brevo (Sendinblue) API
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - Email HTML content
 */
const sendEmail = async (options) => {
    let defaultClient = SibApiV3Sdk.ApiClient.instance;

    // Configure API key authorization: api-key
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.htmlContent;
    sendSmtpEmail.sender = { 
        name: process.env.FROM_NAME || "SherLock System", 
        email: process.env.SENDER_EMAIL 
    };
    sendSmtpEmail.to = [{ email: options.email }];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Brevo API called successfully. Returned data: ' + JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error while calling Brevo API:', error.response ? error.response.body : error);
        throw error;
    }
};

module.exports = sendEmail;

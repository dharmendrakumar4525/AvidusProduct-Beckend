/**
 * Production Environment Configuration
 * Configuration settings for production environment
 * 
 * This file contains configuration for:
 * - Server port and base paths
 * - Database connection (MongoDB)
 * - Email service (SendGrid/SMTP)
 * - AWS S3 configuration
 * - JWT and encryption secrets
 * - File upload directories
 * - Twilio SMS configuration
 * 
 * All values are read from environment variables.
 * 
 * @module config/env/production
 */

module.exports =  {
    port: process.env.PORT,
    admin: {
        path: "/manager"
    },
    serverBasePath:"",
    sessionSecret: process.env.SESSION_SECRET,
    /**prefix for endpoints */
    API: {
        web: "/api/web",
        serverBasePath: `${process.env.SERVER_BASE_PATH}`
    },
    signBasePath: `${process.env.SERVER_BASE_PATH}/uploads`,
     /**email */
    sendgrid: {
        service: 'SendGrid',
        auth: {
            api_user: process.env.SENDGRID_API_USER,
            api_key: process.env.SENDGRID_API_KEY
        },
        from: process.env.EMAIL_FROM
    },
    smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth_user: process.env.SMTP_USER,
        auth_pass: process.env.SMTP_PASS,             
        from: process.env.EMAIL_FROM
    },
    aws:{
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION,
        bucket:process.env.AWS_BUCKET
    },
    dbBackup:false,
    backupAws:{
        accessKeyId: process.env.DB_BACKUP_AWS_ACCESS_KEY,
        secretAccessKey: process.env.DB_BACKUP_AWS_SECRET_KEY,
        region: process.env.DB_BACKUP_AWS_REGION,
        bucket:process.env.DB_BACKUP_AWS_BUCKET
    },
    /**database configuration */
    db: {
        name: process.env.DATABASE_NAME,
        url: process.env.MONGO_URL,
        autoIndex:true,
        options: {
            user: "",
            pass: ""
        }
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNTSID,
        authToken: process.env.TWILIO_AUTHTOKEN,
        from: process.env.TWILIO_FROM
    },

    fileBasePath: ``,
    companyDefaultLogo: ``,
    /**listing */
    listing: {
        limit: 1000 //no. of records to be send per page
    },
    /**directories */
    dir: {
        documents: "uploads" //directory name for uploading documents
    },
    /**Seceret key used by jwt to create  jwt token and verifying it */
    secret: process.env.JWT_SECRET,
    /**secret key use to encrpty data at db */
    dbSecret: Buffer.from(`${process.env.DB_SECRET}`).toString("base64"),
    /**secret key use to encrpty data in transport layer */
    transitSecret: process.env.TRANSIT_SECRET,
    /**to stop morgon make it false */
    debug_mongo: true,
    /**environment */
    dev: true,
    /**transport layer encryption  */
    transitEncryption: false,
    defaultLang:'en'
};
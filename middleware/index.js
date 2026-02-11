/**
 * Express Middleware
 * Contains middleware functions for request processing
 */

const jwt = require("jsonwebtoken");
const env = require("../config/env");
const Response = require("../libs/response");
const { responseMessage } = require("../libs/responseMessages");

const middleware = {
    /**
     * JWT Verification Middleware
     * 
     * Currently disabled - all routes pass through without token verification
     * To enable JWT authentication, uncomment the verification logic below
     * 
     * This middleware:
     * 1. Extracts JWT token from Authorization header
     * 2. Verifies token signature and expiration
     * 3. Validates user data from token
     * 4. Attaches user information to request object
     * 
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    jwtVerify: async (req, res, next) => {
        try {
            // TODO: Uncomment below to enable JWT authentication
            
            // Step 1: Check if authorization header exists
            // if (!req.headers.authorization) {
            //     throw {
            //         code: 403,
            //         err: "authorization header is missing",
            //         message: "while verifying token"
            //     };
            // }

            // let lang = 'en';

            // Step 2: Extract and verify JWT token
            // let encryptedData = req.headers.authorization.replace("Bearer ", "");
            // const token = encryptedData;

            // const decodedToken = await jwt.verify(
            //     token,
            //     env.secret,
            //     (err, result) => {
            //         if (err) {
            //             throw {
            //                 code: 401,
            //                 message: responseMessage(lang,"TOKEN_VERIFICATON_FAILED"),
            //                 err: err
            //             };
            //         } else {
            //             return result;
            //         }
            //     }
            // );

            // Step 3: Validate token structure
            // if (!(decodedToken && decodedToken.sub && decodedToken.exp)) {
            //     throw {
            //         code: 401,
            //         message: responseMessage(lang,"TOKEN_VERIFICATON_FAILED" ),
            //         err: responseMessage(lang,"INVALID_TOKEN")
            //     };
            // }

            // Step 4: Check token expiration
            // let tokenExpiry = decodedToken.exp * 1000;
            // let currentDate = new Date().getTime();
            // let tokenDate = new Date(tokenExpiry).getTime();

            // if (tokenDate < currentDate) {
            //     throw {
            //         code: 401,
            //         message: responseMessage(lang,"TOKEN_IS_EXPIRED"),
            //         err: responseMessage(lang,"INVALID_TOKEN")
            //     };
            // }

            // Step 5: Validate user data from token
            // let getUserByToken = await getUserData(token, decodedToken.sub, req);

            // if (!(getUserByToken && getUserByToken.data && getUserByToken.data.company_id)) {
            //     throw {
            //         code: 401,
            //         message: responseMessage(lang,"TOKEN_VERIFICATON_FAILED"),
            //         err: responseMessage(lang,"INVALID_TOKEN" )
            //     };
            // }
            
            // Currently allowing all requests to pass through
            next();

        } catch (error) {
            // Extract status code from error object
            let statusCode = '';

            // Check for status in error.response (axios errors)
            if (error && error.response && error.response.status) {
                statusCode = error.response.status;
            }
            
            // Check for status in error.code
            if (error && error.code) {
                statusCode = error.code;
            }

            // Handle different error response formats
            if (error && error.response && error.response.data) {
                // Axios-style error response
                res.status(statusCode || 401).json(
                    await Response.errors({
                        err: error.response.data,
                        code: statusCode,
                        message: error.message
                    })
                );
            } else {
                // Standard error response
                res.status(statusCode || 401).json(
                    await Response.errors({
                        err: error.err || error,
                        code: statusCode,
                        message: error.message
                    })
                );
            }
        }
    }
};



// Export middleware functions
module.exports = middleware;
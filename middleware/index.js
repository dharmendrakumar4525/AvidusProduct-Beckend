const jwt = require("jsonwebtoken");
const env = require("../config/env");
const Response = require("../libs/response");
const { responseMessage } = require("../libs/responseMessages");
const { ObjectId } = require("mongodb");

const middleware = {
  jwtVerify: async (req, res, next) => {
    try {
      // 1️⃣ Check Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(403).json(
          await Response.errors({
            message: "Authorization header is missing",
          })
        );
      }
      // 2️⃣ Extract token
      const token = authHeader.replace("Bearer ", "");
      // 3️⃣ Verify token
      let decoded = jwt.verify(token, env.secret);
      // 4️⃣ Validate decoded token
      if (!decoded || !decoded.id) {
        return res.status(401).json(
          await Response.errors({
            message: responseMessage("en", "TOKEN_VERIFICATON_FAILED"),
          })
        );
      }
      // 5️⃣ Validate companyIdf for multi-tenant isolation
      if (!decoded.companyIdf) {
        return res.status(401).json(
          await Response.errors({
            message: "Unauthorized: companyIdf is missing from token",
          })
        );
      }
// ✅ Convert companyIdf to ObjectId
decoded.companyIdf = new ObjectId(decoded.companyIdf);
      // 6️⃣ Attach user to request
      req.user = decoded;

      next();
    } catch (error) {
      console.log(error,"err")
      return res.status(401).json(
        await Response.errors({
          message: responseMessage("en", "TOKEN_VERIFICATON_FAILED"),
          err: error.message,
        })
      );
    }
  },
};

module.exports = middleware;
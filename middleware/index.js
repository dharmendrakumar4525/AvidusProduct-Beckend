const jwt = require("jsonwebtoken");
const env = require("../config/env");
const Response = require("../libs/response");
const { responseMessage } = require("../libs/responseMessages");

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
      const decoded = jwt.verify(token, env.secret);

      // 4️⃣ Validate decoded token
      if (!decoded || !decoded.id) {
        return res.status(401).json(
          await Response.errors({
            message: responseMessage("en", "TOKEN_VERIFICATON_FAILED"),
          })
        );
      }

      // 5️⃣ Attach user to request (optional but recommended)
      req.user = decoded;

      next();
    } catch (error) {
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
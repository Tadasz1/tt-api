const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access Denied" });

  try {
    const verified = jwt.verify(token, "JWT_ACCESS_SECRET");
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid Session" });
  }
};

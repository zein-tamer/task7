
const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');


// register

const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password too short" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// login

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail })
  .select('+password')
  .select('+refreshTokens');


    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

   const accessToken = jwt.sign(
  {
    UserInfo: {
      id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles   
    }
  },
  process.env.ACCESS_TOKEN_SECRET,
  { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
);
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    user.refreshTokens.push({
      token: refreshToken,
      device: req.headers["user-agent"] || "unknown"
    });

    await user.save();

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





// refresh token

const RefreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.jwt || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const user = await User.findOne({
      refreshTokens: { $elemMatch: { token: refreshToken } }
    }).select('+refreshTokens');

    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err || decoded.id !== user._id.toString()) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      // 1) حذف التوكن القديم
      user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);

      // 2) إنشاء refresh token جديد
      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      // 3) حفظ التوكن الجديد
      user.refreshTokens.push({
        token: newRefreshToken,
        device: req.headers["user-agent"] || "unknown"
      });

      await user.save();

      // 4) إرسال refresh token الجديد في cookie
      res.cookie("jwt", newRefreshToken, {
        httpOnly: true,
         sameSite: "Lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      // 5) إنشاء access token جديد
      const newAccessToken = jwt.sign(
        {
          UserInfo: {
            id: user._id,
            name: user.name,
            email: user.email,
            roles: user.roles
          }
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
      );

      res.json({ accessToken: newAccessToken });
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




// logout from all devices

const logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.refreshTokens = [];
    await user.save();

    res.clearCookie("jwt");

    res.json({ message: "Logged out from all devices" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};






// logout from current device only

const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.jwt;
        
        // إذا لم يوجد كوكي، فقط نحذف الكوكي من المتصفح (لزيادة التأمين)
        if (!refreshToken) {
            res.clearCookie("jwt", { httpOnly: true, sameSite: "Strict", secure: process.env.NODE_ENV === "production" });
            return res.sendStatus(204); // No Content
        }

        // البحث عن المستخدم الذي يملك هذا التوكن وحذفه من مصفوفته
        const user = await User.findOne({ "refreshTokens.token": refreshToken });
        
        if (user) {
            user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
            await user.save();
        }

        // مسح الكوكي من المتصفح
        res.clearCookie("jwt", { httpOnly: true, sameSite: "Strict", secure: process.env.NODE_ENV === "production" });
        res.json({ message: "Logged out successfully" });
        
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};






// forgot password


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    res.json({
      message: "Reset link generated",
      resetUrl: `http://localhost:5000/auth/reset-password/${resetToken}`
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// reset password

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  register,
  login,
  RefreshToken,
  resetPassword,
  forgotPassword,
  logoutAll,
  logout
};

const authRepository = require("./auth.repository");
const { hashPassword, comparePassword } = require("../../utils/password");
const { generateToken } = require("../../utils/jwt");
const ApiError = require("../../utils/apiError");

async function registerBusinessOwner({
  businessName,
  businessType,
  address,
  phone,
  ownerName,
  email,
  password,
}) {
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  // First user for a new business is always the owner
  const business = await authRepository.createBusiness({
    name: businessName,
    type: businessType,
    address,
    phone,
  });

  const passwordHash = await hashPassword(password);

  const user = await authRepository.createUser({
    businessId: business.business_id,
    name: ownerName,
    email,
    passwordHash,
    role: "owner",
  });

  const token = generateToken({
    userId: user.user_id,
    businessId: user.business_id,
    role: user.role,
  });

  return { user, business, token };
}

async function login({ email, password }) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = generateToken({
    userId: user.user_id,
    businessId: user.business_id,
    role: user.role,
  });

  // strip password_hash before returning
  const { password_hash, ...safeUser } = user;

  return { user: safeUser, token };
}

module.exports = {
  registerBusinessOwner,
  login,
};

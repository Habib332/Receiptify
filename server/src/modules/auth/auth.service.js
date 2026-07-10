const authRepository = require("./auth.repository");
const { hashPassword, comparePassword } = require("../../utils/password");
const {
  generateIdentityToken,
  generateSessionToken,
} = require("../../utils/jwt");
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

  const passwordHash = await hashPassword(password);

  const user = await authRepository.createUser({
    name: ownerName,
    email,
    passwordHash,
  });

  const business = await authRepository.createBusiness({
    name: businessName,
    type: businessType,
    address,
    phone,
  });

  await authRepository.linkUserToBusiness({
    businessId: business.business_id,
    userId: user.user_id,
    role: "owner",
  });

  const identityToken = generateIdentityToken({ userId: user.user_id });

  return { user, business, identityToken };
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

  const businesses = await authRepository.getUserBusinesses(user.user_id);
  const identityToken = generateIdentityToken({ userId: user.user_id });

  const { password_hash, ...safeUser } = user;

  return { user: safeUser, businesses, identityToken };
}

async function selectBusiness({ userId, businessId }) {
  const membership = await authRepository.getUserRoleForBusiness({
    userId,
    businessId,
  });
  if (!membership) {
    throw new ApiError(403, "You do not belong to this business");
  }

  const sessionToken = generateSessionToken({
    userId,
    businessId,
    role: membership.role,
  });

  return { sessionToken, role: membership.role };
}

module.exports = {
  registerBusinessOwner,
  login,
  selectBusiness,
};

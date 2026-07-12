const authRepository = require("./auth.repository");
const { hashPassword, comparePassword } = require("../../utils/password");
const {
  generateIdentityToken,
  generateSessionToken,
} = require("../../utils/jwt");
const ApiError = require("../../utils/apiError");

async function register({ name, email, password }) {
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await authRepository.createUser({ name, email, passwordHash });

  const identityToken = generateIdentityToken({ userId: user.user_id });

  return { user, identityToken };
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

async function getCurrentUser(userId) {
  const user = await authRepository.findUserById(userId);
  return user;
}

module.exports = { getCurrentUser };
module.exports = { register, login, selectBusiness , getCurrentUser };

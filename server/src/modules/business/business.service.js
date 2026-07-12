const businessRepository = require("./business.repository");
const receiptsRepository = require("../receipts/receipts.repository");
const ApiError = require("../../utils/apiError");

// Confirms the requesting user is owner/manager OF THIS SPECIFIC business.
// Deliberately re-checks against business_users rather than trusting
// req.user.role from the sessionToken, since that role reflects whichever
// business the user most recently selected — not necessarily the one
// being modified here (a user can belong to multiple businesses with
// different roles in each).
async function assertCanModifyBusiness({ userId, businessId, allowedRoles }) {
  const membership = await businessRepository.getUserRoleForBusiness({
    userId,
    businessId,
  });

  if (!membership) {
    throw new ApiError(403, "You do not belong to this business");
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new ApiError(
      403,
      `Only ${allowedRoles.join(" or ")} can perform this action`,
    );
  }

  return membership;
}

async function createBusiness({ userId, name, type, address, phone }) {
  if (!name) {
    throw new ApiError(400, "Business name is required");
  }

  const duplicate = await businessRepository.findDuplicateBusiness({
    name,
    address,
  });
  if (duplicate) {
    throw new ApiError(
      409,
      "A business with this name and address already exists",
    );
  }

  const business = await businessRepository.createBusiness({
    name,
    type,
    address,
    phone,
  });

  await businessRepository.linkUserToBusiness({
    businessId: business.business_id,
    userId,
    role: "owner", // whoever creates a business is always its owner
  });

  return business;
}

// Owner AND manager can update, per project decision.
async function updateBusiness({ userId, businessId, updates }) {
  const existing = await businessRepository.findBusinessById(businessId);
  if (!existing) {
    throw new ApiError(404, "Business not found");
  }

  await assertCanModifyBusiness({
    userId,
    businessId,
    allowedRoles: ["owner", "manager"],
  });

  // If name/address are changing, re-check the duplicate rule against the
  // new values (skipping the business's own current row).
  if (updates.name || updates.address) {
    const nextName = updates.name ?? existing.name;
    const nextAddress = updates.address ?? existing.address;
    const duplicate = await businessRepository.findDuplicateBusiness({
      name: nextName,
      address: nextAddress,
    });
    if (duplicate && duplicate.business_id !== Number(businessId)) {
      throw new ApiError(
        409,
        "A business with this name and address already exists",
      );
    }
  }

  return businessRepository.updateBusiness(businessId, updates);
}

// Owner ONLY can delete, per project decision. Requires an explicit
// confirm flag from the caller — this doesn't replace a frontend "Are you
// sure?" dialog, but it does mean a delete can never happen from a request
// that didn't deliberately set confirm: true, protecting against e.g. an
// accidental double-click firing the same request twice without intent,
// or an integration bug that fires DELETE without a real user action.
async function deleteBusiness({ userId, businessId, confirm }) {
  const existing = await businessRepository.findBusinessById(businessId);
  if (!existing) {
    throw new ApiError(404, "Business not found");
  }

  await assertCanModifyBusiness({
    userId,
    businessId,
    allowedRoles: ["owner"],
  });

  if (!confirm) {
    throw new ApiError(
      400,
      "Deletion requires explicit confirmation (confirm: true) — this will also delete all receipts for this business",
    );
  }

  return businessRepository.deleteBusiness(businessId);
}

// Powers the "Available Businesses" table + search/filter controls.
async function listBusinesses({ search, type } = {}) {
  return businessRepository.getAllBusinesses({ search, type });
}

// Powers the 4 stat cards at the top of the dashboard.
async function getDashboardStats() {
  const [totalBusinesses, types, totalReceipts, mostUsed] = await Promise.all([
    businessRepository.countAllBusinesses(),
    businessRepository.getDistinctBusinessTypes(),
    receiptsRepository.countAllReceipts(),
    receiptsRepository.getMostUsedBusiness(),
  ]);

  return {
    totalBusinesses,
    businessTypes: types.length,
    businessTypesList: types, // handy for the "All Types" filter dropdown too
    totalReceipts,
    mostUsed: mostUsed
      ? {
          businessId: mostUsed.business_id,
          name: mostUsed.name,
          receiptCount: mostUsed.receipt_count,
        }
      : null, // no receipts anywhere yet
  };
}

module.exports = {
  createBusiness,
  listBusinesses,
  getDashboardStats,
  updateBusiness,
  deleteBusiness,
};

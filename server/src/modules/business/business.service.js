const businessRepository = require("./business.repository");
const receiptsRepository = require("../receipts/receipts.repository");
const { uploadBusinessLogo } = require("../../utils/supabaseStorage");
const ApiError = require("../../utils/apiError");

// Confirms the requesting user is owner/manager OF THIS SPECIFIC business.
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
    role: "owner",
  });

  return business;
}

// Owner and manager can update
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

// Owner only can delete
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

// Upload business logo
async function uploadLogo({
  userId,
  businessId,
  fileBuffer,
  originalName,
  mimeType,
}) {
  const existing = await businessRepository.findBusinessById(businessId);

  if (!existing) {
    throw new ApiError(404, "Business not found");
  }

  await assertCanModifyBusiness({
    userId,
    businessId,
    allowedRoles: ["owner", "manager"],
  });

  let logoUrl;

  try {
    logoUrl = await uploadBusinessLogo({
      fileBuffer,
      originalName,
      mimeType,
      businessId,
    });
  } catch (err) {
    throw new ApiError(400, err.message);
  }

  return businessRepository.updateBusiness(businessId, {
    logoUrl,
  });
}

// Available Businesses
async function listBusinesses({ userId, search, type } = {}) {
  const businesses = await businessRepository.getAllBusinesses({
    search,
    type,
  });

  if (!businesses.length) {
    return [];
  }

  const businessIds = businesses.map((b) => b.business_id);

  const roleMap = await businessRepository.getUserRolesForBusinesses({
    userId,
    businessIds,
  });

  return businesses.map((business) => ({
    ...business,
    userRole: roleMap[business.business_id] ?? null,
  }));
}

// Dashboard cards
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
    businessTypesList: types,
    totalReceipts,
    mostUsed: mostUsed
      ? {
          businessId: mostUsed.business_id,
          name: mostUsed.name,
          receiptCount: mostUsed.receipt_count,
        }
      : null,
  };
}

// NOTE: the old joinBusiness (instant staff membership, no approval) was
// removed — replaced by the request/approve flow in
// businessJoinRequests.service.js. See POST /:businessId/join-requests.

module.exports = {
  createBusiness,
  updateBusiness,
  deleteBusiness,
  uploadLogo,
  listBusinesses,
  getDashboardStats,
};

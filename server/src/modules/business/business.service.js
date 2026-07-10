const businessRepository = require("./business.repository");

async function createBusiness({ userId, name, type, address, phone }) {
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

module.exports = { createBusiness };

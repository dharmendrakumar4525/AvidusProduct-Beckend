/**
 * Onboarding Company Controller
 * Handles CRUD operations for SaaS tenant companies
 */

const OnboardingCompany = require("../../models/onboardingcompany");
const { getCache, setCache, deleteCache, invalidateEntity, invalidateEntityList } = require("../../utils/cache");
const { MASTER_DATA } = require("../../libs/cacheConfig");
const Response = require("../../libs/response");
const { uploadToS3 } = require("../../utils/s3");
const slugify = require("slugify");


// Export functions
module.exports = {
  getList,
  getDataByID,
  createData,
  updateData,
  deleteData,
};


/**
 * Get Company List
 * GET /api/web/onboardingcompany
 */
async function getList(req, res) {
  try {
    const search = req.query.search?.trim();
    const page = Number(req.query.page);
    const limit = Number(req.query.per_page);
    const sortOrder = req.query.order === "desc" ? -1 : 1;

    const hasPagination =
      Number.isInteger(page) && page > 0 &&
      Number.isInteger(limit) && limit > 0;

    const cacheKey = `onboardingcompany:list:search=${search || "none"}:page=${hasPagination ? page : "all"}:limit=${hasPagination ? limit : "all"}:order=${sortOrder}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        source: "cache",
      });
    }

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    let companyQuery = OnboardingCompany.find(query)
      .sort({ name: sortOrder })
      .lean();

    let response;

    if (hasPagination) {
      const skip = (page - 1) * limit;

      const companies = await companyQuery.skip(skip).limit(limit);
      const total = await OnboardingCompany.countDocuments(query);

      response = {
        data: companies,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      };
    } else {
      const companies = await companyQuery;
      response = { data: companies };
    }

    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json({
      ...response,
      source: "db",
    });

  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        { errors: error.errors, message: error.message },
        error,
        req
      )
    );
  }
}


/**
 * Get Company by ID
 * GET /api/web/onboardingcompany/:id
 */
async function getDataByID(req, res) {
  try {
    const companyId = req.params.id;
    const cacheKey = `onboardingcompany:details:${companyId}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        source: "cache",
      });
    }

    const company = await OnboardingCompany.findById(companyId).lean();

    if (!company) return res.send("no company exists");

    await setCache(cacheKey, company, MASTER_DATA);

    return res.status(200).json({
      ...company,
      source: "db",
    });

  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        { errors: error.errors, message: error.message },
        error,
        req
      )
    );
  }
}


/**
 * Create Company
 * POST /api/web/onboardingcompany
 */
async function createData(req, res) {
  try {

    let logoUrl = null;
    let signatureUrl = null;

    // ✅ Case-insensitive duplicate check
    const existingCompany = await OnboardingCompany.findOne({
      name: { $regex: `^${req.body.name}$`, $options: "i" }
    });

    if (existingCompany) {
      return res.status(400).json({
        message: "Company name already exists"
      });
    }

// Find files inside array
const logoFile = req.files.find(file => file.fieldname === "logo");
const signatureFile = req.files.find(file => file.fieldname === "signature");

if (logoFile) {
  console.log("Uploading logo...");
  logoUrl = await uploadToS3(logoFile);
}

if (signatureFile) {
  console.log("Uploading signature...");
  signatureUrl = await uploadToS3(signatureFile);
}
    const company = new OnboardingCompany({
      name: req.body.name,
      logo: logoUrl,
      signature: signatureUrl,
      subscriptionPlan: req.body.subscriptionPlan,
      subscriptionExpiry: req.body.subscriptionExpiry,
      contactEmail: req.body.contactEmail,
      contactPhone: req.body.contactPhone,
      address: req.body.address,
      isActive: req.body.isActive,
    });

    const savedCompany = await company.save();

    await invalidateEntityList("onboardingcompany");

    res.send(savedCompany);

  } catch (error) {
    return res.status(422).json(error);
  }
}

/**
 * Update Company
 * PUT /api/web/onboardingcompany/:id
 */
async function updateData(req, res) {
  try {
    const existingCompany = await OnboardingCompany.findById(req.params.id);
    if (!existingCompany) return res.send("company not found");

    let updateData = {};

    // ✅ Only update if field exists in body
    if (req.body.name !== undefined) {
  updateData.name = req.body.name;

  if (!req.body.slug) {
    updateData.slug = slugify(req.body.name, { lower: true, strict: true });
  } else {
    updateData.slug = req.body.slug;
  }
}

    if (req.body.subscriptionPlan !== undefined) {
      updateData.subscriptionPlan = req.body.subscriptionPlan;
    }

    if (req.body.subscriptionExpiry !== undefined) {
      updateData.subscriptionExpiry = req.body.subscriptionExpiry;
    }

    if (req.body.contactEmail !== undefined) {
      updateData.contactEmail = req.body.contactEmail;
    }

    if (req.body.contactPhone !== undefined) {
      updateData.contactPhone = req.body.contactPhone;
    }

    if (req.body.address !== undefined) {
      updateData.address = req.body.address;
    }

    if (req.body.isActive !== undefined) {
      updateData.isActive = req.body.isActive;
    }

    // ✅ Handle files only if uploaded
    const logoFile = req.files?.find(f => f.fieldname === "logo");
    const signatureFile = req.files?.find(f => f.fieldname === "signature");

    if (logoFile) {
      updateData.logo = await uploadToS3(logoFile);
    }

    if (signatureFile) {
      updateData.signature = await uploadToS3(signatureFile);
    }

    const company = await OnboardingCompany.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    await deleteCache(`onboardingcompany:details:${req.params.id}`);
    await invalidateEntityList("onboardingcompany");

    res.send(company);

  } catch (error) {
    return res.status(422).json(error);
  }
}


/**
 * Delete Company
 * DELETE /api/web/onboardingcompany/:id
 */
async function deleteData(req, res) {
  try {
    const company = await OnboardingCompany.findByIdAndRemove(req.params.id);

    if (!company) return res.send("company not deleted");

    await deleteCache(`onboardingcompany:details:${req.params.id}`);
    await invalidateEntityList("onboardingcompany");

    res.send(company);

  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        { errors: error.errors, message: error.message },
        error,
        req
      )
    );
  }
}
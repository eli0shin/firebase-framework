const validateToken = require('../../auth/validate_token');
const organizationMemberships = require('../../auth/organization_memberships');
const isSystemAdmin = require('../../auth/is_system_admin');

const validatePrivilege = privilege => async (
  req,
  res,
  next,
) => {
  try {
    const isAuthorized = await checkIfAuthorized(
      typeof privilege === 'string'
        ? privilege
        : selectPrivilege(req),
      req,
    );
    if (isAuthorized) return next();
    else throw new Error('unauthorized');
  } catch (error) {
    return res
      .status(401)
      .send({ status: 'error', error: error.message });
  }
};

function selectPrivilege(req) {
  const requestedPrivilege = req.headers.role;

  if (typeof requestedPrivilege === 'string') {
    return requestedPrivilege;
  }
  return 'any';
}

async function checkIfAuthorized(privilege, req) {
  if (privilege === 'any') {
    return true;
  }

  try {
    const accessToken = req.headers['access-token'];
    if (!accessToken) return false;

    const uid = await validateToken(accessToken);
    if (!uid) {
      throw new ReferenceError(
        `the user's token is invalid`,
      );
    }

    const isSysAdmin = await isSystemAdmin(uid);

    if (isSysAdmin) {
      return true;
    } else if (privilege === 'sys-admin') {
      throw new ReferenceError(
        `the user has insufficient permissions`,
      );
    }

    if (req.params.subdomain) {
      await checkUserMembership(uid, req);
    } else if (req.params.uid) {
      checkUid(req, uid);
    }
    return true;
  } catch (error) {
    return false;
  }
}

const checkUid = (req, uid) => {
  const isMatch = req.params.uid === uid;
  if (!isMatch) {
    throw new Error('unauthorized');
  }
};

const checkUserMembership = async (uid, req) => {
  const userMemberships = await organizationMemberships(
    uid,
  );

  const { subdomain } = req.params;

  if (!isAdmin(userMemberships, subdomain)) {
    throw new Error(`user is not an admin of ${subdomain}`);
  }
};

const isAdmin = (userMemberships, subdomain) =>
  userMemberships.some(
    ({ organization_subdomain, is_org_admin }) =>
      organization_subdomain === subdomain && is_org_admin,
  );

module.exports = validatePrivilege;

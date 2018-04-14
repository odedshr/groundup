class DetailedError extends Error {
  constructor(message, status, details, stack) {
    super(...arguments);
    this.message = message;
    this.stack = stack;
    this.status = status;
    this.details = details;
  }
}

class Errors {
  systemError(error, args, url) {
    return new DetailedError('system-error', 500, { args, error, url }, error);
  }
  
  unauthorized() {
    return new DetailedError('unauthorized', 401);
  }
  
  notFound(type, id) {
    return new DetailedError('not-found', 404, { key: type, value: id });
  }
  
  noPermissions(actionName) {
    return new DetailedError('no-permissions', 401, { action: actionName });
  }
  
  badInput(key, value) {
    return new DetailedError('bad-input', 406, { key: key, value: value });
  }
  
  tooLong(varName, value) {
    return new DetailedError('too-long', 406, { key: varName, value: value });
  }
  
  tooShort(varName, value) {
    return new DetailedError('too-short', 406, { key: varName, value: value });
  }
  
  immutable(varType) {
    return new DetailedError('immutable', 406, { key: varType });
  }
  
  alreadyExists(varType, value) {
    return new DetailedError('already-exists', 409, { key: varType, value: value });
  }
  
  missingInput(varName) {
    return new DetailedError('missing-input', 406, { key: varName });
  }
  
  expired(varName) {
    return new DetailedError('expired', 406, { key: varName });
  }
  
  saveFailed(varName, content, error) {
    return new DetailedError('save-failed', 500, { key: varName, value: content }, error);
  }
  
  custom(action, description, error) {
    return new DetailedError('custom-error', 500, { key: action, value: description }, error);
  }
}

module.exports = new Errors();
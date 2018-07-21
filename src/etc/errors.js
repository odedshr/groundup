class DetailedError extends Error {
  constructor(message, status, details, stack) {
    super(...arguments);
    this.message = message;
    this.stack = stack;
    this.status = status;
    this.details = details;
  }
}

class AlreadyExists extends DetailedError {
  constructor(varType, value) {
    super('already-exists', 409, { key: varType, value: value });
  }
}

class BadInput extends DetailedError {
  constructor(key, value) {
    super('bad-input', 406, { key: key, value: value });
  }
}

class Custom extends DetailedError {
  constructor(action, description, error) {
    super('custom-error', 500, { key: action, value: description }, error);
  }
}
class Expired extends DetailedError {
  constructor(varName) {
    super('expired', 406, { key: varName });
  }
}

class Immutable extends DetailedError {
  constructor(varType) {
    super('immutable', 406, { key: varType });
  }
}

class MissingInput extends DetailedError {
  constructor(varName) {
    super('missing-input', 406, { key: varName });
  }
}

class NotFound extends DetailedError {
  constructor(type, id) {
    super('not-found', 404, { key: type, value: id });
  }

  toString() {
    return `${this.details.key} not Found: ${this.details.value}`;
  }
}

class NoPermissions extends DetailedError {
  constructor(actionName) {
    super('no-permissions', 401, { action: actionName });
  }
}

class SaveFailed extends DetailedError {
  constructor(varName, content, error) {
    super('save-failed', 500, { key: varName, value: content }, error);
  }
}

class System extends DetailedError {
  constructor(error, args, url) {
    super('system-error', 500, { args, error, url }, error);
  }
}

class TooLong extends DetailedError {
  constructor(varName, value, max = '?') {
    super('too-long', 406, { key: varName, value: value, max });
  }

  toString() {
    return `${this.details.key} is longer than ${this.details.max} (${
      this.details.value
    })`;
  }
}

class TooShort extends DetailedError {
  constructor(varName, value, min = '?') {
    super('too-short', 406, { key: varName, value: value, min });
  }

  toString() {
    return `${this.details.key} is shorter than ${this.details.min} (${
      this.details.value
    })`;
  }
}

class Unauthorized extends DetailedError {
  constructor() {
    super('unauthorized', 401);
  }
}

export default {
  AlreadyExists,
  BadInput,
  Custom,
  Expired,
  Immutable,
  MissingInput,
  NotFound,
  NoPermissions,
  SaveFailed,
  System,
  TooLong,
  TooShort,
  Unauthorized
};

class CustomError extends Error {
	constructor(error) {
		super(error);
		this.message = error.message || String(error);
		this.type = (this.constructor && this.constructor.name) || 'CustomError';
		this.code = 500;
		if (error.stack) {
			this.stack = error.stack;
		}
	}
}

class NotFoundError extends CustomError {
	constructor(message = 'Not found') {
		super(message);
		this.code = 404;
	}
}

/**
 * Create a guard you can use to easily add not found to promise chains.
 * Example: find(id).then(NotFoundError.guard(id))
 * @param args Arguments to pass along to error constructor
 * @return {Function}
 */
NotFoundError.guard = function (...args) {
	const ErrorCtr = this;
	return (val) => {
		if (!val) {
			throw new ErrorCtr(...args);
		}
		return val;
	};
};

module.exports = {
	CustomError,
	NotFoundError
};
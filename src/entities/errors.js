class CustomError extends Error {
	constructor(error) {
		super(error);
		this.message = error.message || String(error);
		this.code = 500;
		if (error.stack) {
			this.stack = error.stack;
		}
	}
}

module.exports = {
	CustomError
};
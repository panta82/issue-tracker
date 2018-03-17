const expect = require('chai').expect;
const sinon = require('sinon');

const {prepareTestDatabase, resetTestDatabase, closeTestDatabase, getTestApp} = require('../test_tools');
const {IssueManager} = require('../../src/services/issue_manager');

describe('IssueManager', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	it('can create issues', () => {
		/** @type App */
		const app = getTestApp();
		
		const issueManager = new IssueManager({}, app);
		const user = new app.User({
			_id: new app.mongoose.Types.ObjectId(),
		});
		
		return issueManager
			.createIssue(user, {
				title: 'abc',
				content: 'def',
				status: 'pending'
			})
			.then(() => {
				return app.Issue.findOne({
					title: 'abc'
				});
			})
			.then(/** Issue */ issue => {
				expect(issue.author).to.eql(user._id);
				expect(issue.title).to.equal('abc');
				expect(issue.content).to.equal('def');
				expect(issue.status).to.equal('pending');
				expect(issue.created_at).to.be.instanceOf(Date);
				expect(issue.updated_at).to.be.instanceOf(Date);
				expect(issue.deleted_at).to.be.not.ok;
			});
	});
});
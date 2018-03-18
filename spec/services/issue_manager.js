const expect = require('chai').expect;
const sinon = require('sinon');

const lodash = require('lodash');

const {prepareTestDatabase, resetTestDatabase, closeTestDatabase, getTestApp} = require('../test_tools');
const {IssueManager} = require('../../src/services/issue_manager');

describe('IssueManager', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	function testUser(app, data) {
		const user = new app.User({
			_id: new app.mongoose.Types.ObjectId(),
		});
		Object.assign(user, data);
		return user;
	}
	
	describe('validateIssueId', () => {
		it('will validate an existing issue', () => {
			/** @type App */
			const app = getTestApp();
			const issueManager = new IssueManager({}, app);
			const user = testUser(app);
			
			return issueManager
				.createIssue(user, {
					title: 'abc',
					content: 'def',
					status: 'pending',
				})
				.then((issue) => {
					return issueManager.validateIssueId(issue._id);
				});
		});
		
		it('will throw NotFound for missing issue', () => {
			/** @type App */
			const app = getTestApp();
			
			const issueManager = new IssueManager({}, app);
			
			return issueManager.validateIssueId(new app.mongoose.Types.ObjectId()).then(
				sinon.stub().throws(),
				(err) => {
					expect(err).to.be.instanceOf(Error);
					expect(err.type).to.equal('IssueNotFoundError');
				});
		});
		
		it('will throw 400 error for deleted issue', () => {
			/** @type App */
			const app = getTestApp();
			const issueManager = new IssueManager({}, app);
			const user = testUser(app);
			
			return issueManager
				.createIssue(user, {
					title: 'abc',
					content: 'def',
					status: 'pending',
					deleted_at: new Date()
				})
				.then((issue) => {
					return issueManager.validateIssueId(issue._id).then(
						sinon.stub().throws(),
						(err) => {
							expect(err).to.be.instanceOf(Error);
							expect(err.code).to.equal(400);
						});
				});
		});
		
		describe('createIssue', () => {
			it('works', () => {
				/** @type App */
				const app = getTestApp();
				
				const issueManager = new IssueManager({}, app);
				const user = testUser(app);
				
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
		
		describe('listIssues', () => {
			it('works', () => {
				/** @type App */
				const app = getTestApp();
				
				const issueManager = new IssueManager({}, app);
				const user = testUser(app);
				
				return issueManager
					.createIssue(user, {
						title: 'issue1',
						content: 'content 1',
						status: 'pending'
					})
					.then(() => {
						return issueManager.createIssue(user, {
							title: 'issue2',
							content: 'content 2',
							status: 'pending'
						});
					})
					.then(() => {
						return issueManager.listIssues(1, 2);
					})
					.then(result => {
						expect(result.total).to.equal(2);
						expect(result.limit).to.equal(2);
						expect(result.page).to.equal(1);
						expect(result.pages).to.equal(1);
						expect(result.docs[0].title).to.equal('issue1');
						expect(result.docs[1].title).to.equal('issue2');
					});
			});
		});
		
		describe('updateIssue', () => {
			it('works', () => {
				/** @type App */
				const app = getTestApp();
				
				const issueManager = new IssueManager({}, app);
				const user = testUser(app);
				
				return issueManager
					.createIssue(user, {
						title: 'name',
						content: 'content',
						status: 'complete'
					})
					.then((issue) => {
						return issueManager.updateIssue(issue._id, {
							title: 'new name',
							content: 'new content',
							status: 'pending'
						});
					})
					.then(/** Issue */ issue => {
						return issueManager.getIssueById(issue._id);
					})
					.then(issue => {
						expect(issue.title).to.equal('new name');
						expect(issue.content).to.equal('new content');
						expect(issue.status).to.equal('pending');
						expect(issue.deleted_at).to.be.not.ok;
					});
			});
		});
		
		describe('deleteIssue', () => {
			it('works', () => {
				/** @type App */
				const app = getTestApp();
				
				const issueManager = new IssueManager({}, app);
				const user = testUser(app);
				
				let issueId = null;
				
				return issueManager
					.createIssue(user, {
						title: 'name',
						content: 'content',
						status: 'complete'
					})
					.then((issue) => {
						issueId = issue._id;
						return issueManager.deleteIssue(issueId);
					})
					.then(() => {
						return app.Issue.findById(issueId);
					})
					.then(/** Issue */ issue => {
						expect(issue.title).to.equal('name');
						expect(issue.deleted_at).to.be.instanceOf(Date);
					});
			});
		});
		
		describe('addComment', () => {
			it('works', () => {
				/** @type App */
				const app = getTestApp();
				
				const issueManager = new IssueManager({}, app);
				const user = testUser(app);
				
				let issueId = null;
				
				return issueManager
					.createIssue(user, {
						title: 'abc',
						content: 'def',
						status: 'pending'
					})
					.then((issue) => {
						issueId = issue._id;
						return issueManager.addComment(user, issueId, {
							content: 'my comment'
						});
					})
					.then(() => {
						return app.Comment.findOne({});
					})
					.then(/** Comment */ comment => {
						expect(comment.author).to.eql(user._id);
						expect(comment.issue).to.eql(issueId);
						expect(comment.content).to.equal('my comment');
						expect(comment.created_at).to.be.instanceOf(Date);
						expect(comment.updated_at).to.be.instanceOf(Date);
						expect(comment.deleted_at).to.be.not.ok;
					});
			});
			
			describe('listComments', () => {
				it('works', () => {
					/** @type App */
					const app = getTestApp();
					
					const issueManager = new IssueManager({}, app);
					const user = testUser(app);
					
					let issueId = null;
					
					return issueManager
						.createIssue(user, {
							title: 'issue1',
							content: 'content 1',
							status: 'pending'
						})
						.then((issue) => {
							issueId = issue._id;
							return Promise.all([
								issueManager.addComment(user, issueId, {content: 'comment1'}),
								issueManager.addComment(user, issueId, {content: 'comment2'})
							]);
						})
						.then(() => {
							return issueManager.listComments(issueId, 1, 2);
						})
						.then(result => {
							expect(result.total).to.equal(2);
							expect(result.limit).to.equal(2);
							expect(result.page).to.equal(1);
							expect(result.pages).to.equal(1);
							const docs = lodash.orderBy(result.docs, 'content');
							expect(docs[0].content).to.equal('comment1');
							expect(docs[1].content).to.equal('comment2');
						});
				});
			});
		});
	});
});
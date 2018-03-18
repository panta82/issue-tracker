# Issue Tracker

## Specification

### Scenario:
A customer has requested a Single Page Application (SPA) for an issue log application. They have
specified that they want to:

- Create, view, edit and destroy issues
- Mark issues as complete or pending
- Upload files that are associated with an issue
- Download files associated with an issue
- Create and view comments on issues

The requirements are likely to change in the future, so the code will need to be flexible and maintainable.

### Notes:

- If you make any assumptions, please document them.
- Please keep track of the time it takes for you to implement the challenge

### Task:

Design a RESTful API for the above scenario.

### Specs:

#### Required:
- Done with Node.js
- Use hapijs or express
- Mongodb with Mongoose for storage (files may may be stored in the local file system for simplicity)
- Use Git for version control
- Full test suite using Mocha/Chai or Lab/Code
- Inline function documentation
- API spec

#### Bonus:
- Utilize any relevant ES6 features

## Implementation

### Setup

1. Install node.js and local instance of mongodb.

2. Clone the repo, install dependencies
    ```
    git clone https://github.com/panta82/issue-tracker
    cd issue-tracker
    npm install
    ```

3. Configure your local instance
    ```
    cp settings.yaml settings.local.yaml
    ```
    Then in settings.local.yaml, configure:
      - `Auth.secret`, enter some random string
      - `DocumentStore.directory`, enter path on your local HDD where to store uploaded documents

    You can also optionally configure mongo database, port etc.

4. Create mongo indexes and hooks
    ```
    bin/issue-tracker --indexes
    ```

5. Create your user through CLI (or REPL):
    ```
    bin/issue-tracker --add-user admin,hunter2
    ```

6. Start the app with `npm start` or `bin/issue-tracker`

### Usage

- API docs can be found on /docs endpoint (default: http://localhost:3000/docs/)

- Enter `bin/issue-tracker -h` to see some cli options

- If you run `bin/issue-tracker --repl`, you will enter a customized REPL environment where you can interact with the app (hint: enter `app` and press tab). To deal with promises, wrap them in $p function (`$p(myPromise)`).

- Settings are loaded from the app's root directory. Pattern is `settings.<environment>.<local>.yaml`. Environment is determined by `NODE_ENV` environment variable. Local files are kept out of git, you can add your personalized settings there.


### Assumptions

- This is an internal API for a web-based SPA. It will not serve mobile apps or have 3rd party integrations (OAuth). Frontend is developed by the same or closely related internal team as backend.

- Users will authenticate using bearer tokens (JWT). User creation will be performed through CLI.

- There are no roles or authorization rules. Once users are logged in, anyone can do anything with any issue.

- All records are soft-deleted. Later, purge crons can be added. "Stuck" files can be handled the same way.

- Deployment will be such that app will be able to have configuration file on local HDD and the operator will be able to execute it with CLI parameters.

- Future extensions are expected to be:
  - Added authorization and security
  - More file types or document types uploaded and managed under different circumstances (eg user uploads their CV, avatar...)
  - Comments being added to things other than issues and managed through different screens (eg. moderation queue, search by user)
  - In general, complexity added to deep backend as opposed to API

### Time table

Time table for this project can be found here:

https://docs.google.com/spreadsheets/d/1-vrlc2wDOp0U3JCN8guHtW0nsMlxRsgLId4-hTVPDQM/edit?usp=sharing

### TODO-s

- More unit tests!
- Kill half-open TCP connections when shutting down server
- Better swagger documentation
    - Unmoor swagger from server, move that stuff into own file
    - Better job at generating schemas from Mongoose objects, it is very primitive so far (everything is string!?)
    - Figure out how to document download results
    - Document errors
- Refactor pagination arguments into some kind of "criteria" system
- Allow uploading multiple documents at once
- Separate comments into its own service
- Wrap Joi into own module, so we can extend it globally (does it needs to go into container?)
- Get rid of mongoose.paginated and declare our own return format that we can better document?
- Add mongoose.populate?
- Code coverage report?

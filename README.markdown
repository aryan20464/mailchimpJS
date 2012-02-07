#MailChimp API JavaScript Wrapper 

This is a basic wrapper for [MailChimp's web-based API][1], initially written for [Ecquire][2]. It supports the essential CRUD operations for list-based objects - contacts/subscribers, groups, and merge variables. It uses the user's MailChimp API key for authorization, but can be adapted for use with OAuth 2.0 (Ecquire in fact uses the OAuth 2.0 flow, but that requires a separate library).

A blog post outlining some aspects of writing this wrapper is available [here][3].

##Usage

Since the wrapper uses cross-domain AJAX requests, it must be run from a JavaScript based server (like Node.js) or as a browser extension. The files provided actually make up a complete Google Chrome extension. To run the example, download the source and load it as an extension into Google Chrome. You must set the mailchimpAPIKey. The output will sent to the extension's console (right-click the extension icon and click "Inspect popup" to view).

The wrapper is purely asynchronous, and callbacks are required for the public functions. Callbacks receive a JSON response with the following properties:

    success // true or false
    code    // (if error)  either an HTTP status or MailChimp code
    issue   // (if error)  some explanation of what went wrong
    object  // (if needed) the request object
    
All the functions available to the wrapper can be seen in the example.html file. Most of the functions are fairly self-explanatory. When creating a new contact, the contact to submit must be in the following format:

    {
       Email: "test@example.com",
       Groups: {
         "Location": [
            "East Coast",
            ...
         ],
         ...
       }
       Phone: "123-456-7890"
       Employer: "Ecquire"
       Note: "Met last Tuesday for coffee"
     }

Only Email and Groups are required. The groupings and groups you specify must already exist. Any extra field that you wish to submit (such as "Note" above) will automatically be added to the MailChimp list as a merge variable.

Since merge variables must be unique, alphanumeric, and have a limited length, a (hopefully) unique merge tag is created for any new merge variables that are created. A random two-digit number is appended to the first eight characters of the provided label to create the new merge tag.

##Contact

For any questions regarding the wrapper or Ecquire, feel free to email ben@ecquire.com.

  [1]: http://apidocs.mailchimp.com/api/
  [2]: http://ecquire.com
  [3]: http://somewhere.com


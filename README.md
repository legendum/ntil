# ntil

Create a handler to call a function 'ntil the result is good.

## Use cases for "ntil"

If you've used Gmail, you'll have seen how it retries a network connection when
it fails to retrieve your updated inbox. First it tries after a second, then a
couple of seconds, then a while longer, etc. This is exactly what "ntil" will
do for your code, whether on NodeJS or on the browser (it's designed for both).


## How "ntil" works

The "ntil" function returns a wrapped version of your function to be retried
after waiting 1 second, then 2, then 4, then 8, then 16 and finally after 32.
(You can override the defaults of course). It works in an async manner, so that
your function can do something useful over the network without blocking.

You provide a "check" function to return ```true``` when your function delivers
results that pass your post-conditions. You may also optionally provide "done"
and "fail" callback functions to handle the results of your function call.
Please see the examples below to understand how it works.


## Installing "ntil"

```npm install --save ntil```


## Using "ntil"

This package provides a single method "ntil()" which is called thus:

### ntil(checker, performer, success, failure, opts)

* checker    - a function to check a result and return true or false
* performer  - a function to call to perform a task which may succeed or fail
* success    - an optional function to process the result of a successful call
* failure    - an optional function to process the result of a failed call
* opts       - an optional hash of options (see below)

ntil() will return a handler that may be called with any number of arguments.
The performer function will receive these arguments, with a final "next" arg
appended to the argument list, such that it should be called on completion,
passing the result (as a single argument *or* multiple arguments) thus:

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    var ntil = require('ntil');
    var handler = ntil(
      function(result) { return result === 3 },               // the checker
      function myFunc(a, b, next) { next(a + b) },            // the performer
      function(result) { console.log('success! ' + result) }, // on success
      function(result) { console.log('failure! ' + result) }, // on failure
      {logger: console}                                       // options
    );

    handler(1, 1); // this will fail after 7 attempts (taking about a minute)
    handler(1, 2); // this will succeed immediately

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

...and here's the equivalent code in a syntax more similar to jQuery:

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    var ntil = require('./ntil');
    var handler = ntil(
      function(result) { return result === 3 }
    ).exec(
      function myFunc(a, b, next) { next(a + b) }
    ).done(
      function(result) { console.log('success! ' + result) }
    ).fail(
      function(result) { console.log('failure! ' + result) }
    ).opts(
      {logger: console}
    ).func();

    handler(1, 1); // this will fail after 7 attempts (taking about a minute)
    handler(1, 2); // this will succeed immediately

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

Note that the logger includes "myFunc" in log messages, because the function
is named. An alternative is to use the "name" option (see below).

The "checker" function checks that the result is 3, causing the first handler
to fail (it has a result of 2, not 3) and the second handler to succeed.

The output from both these examples is:

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    perform: 1 failure - trying again in 1 seconds
    perform: success
    success! 3
    perform: 2 failures - trying again in 2 seconds
    perform: 3 failures - trying again in 4 seconds
    perform: 4 failures - trying again in 8 seconds
    perform: 5 failures - trying again in 16 seconds
    perform: 6 failures - trying again in 32 seconds
    perform: too many failures (7)
    failure! 2

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


The options may optionally include:
* name:      The name of the "performer" function we're calling, e.g. "getData"
* logger:    A logger object that responds to "info" and "warn" method calls
* waitSecs:  The initial duration in seconds to wait before retrying
* waitMult:  The factor by which to multiply the wait duration upon each retry
* maxCalls:  The maximum number of calls to make before failing

Note that "waitSecs" defaults to 1, "waitMult" defaults to 2, and "maxCalls"
defaults to 7.


Here's an example that passes 2 result parameters:

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    var ntil = require('./ntil');
    var handler = ntil(
      function(add, sub) { return add === 3 && sub === 1 }
    ).exec(
      function perform(a, b, next) { next(a + b, a - b) }
    ).done(
      function(add, sub) { console.log('success! %d %d', add, sub) }
    ).fail(
      function(add, sub) { console.log('failure! %d %d', add, sub) }
    ).opts(
      {logger: console, maxCalls: 3, waitSecs: 2, waitMult: 1}
    ).func();

    handler(1, 1); // fails after 3 attempts taking 6 seconds
    handler(1, 2); // fails after 3 attempts taking 6 seconds
    handler(2, 1); // succeeds immediately

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

In this example, only the final call to ```handler(2, 1)``` will succeed.


Ideas for improvement? Email kevin.hutchinson@legendum.com

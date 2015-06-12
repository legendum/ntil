/**
 * Copyright (c) 2015, Legendum Ltd. All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * 
 * * Neither the name of ntil nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * ntil - create a handler to call a function until the result is good.
 *
 * This package provides a single method "ntil()" which is called thus:
 *
 * ntil(performer, success, failure, opts)
 *
 * checker    - a function to check a result and return true or false
 * performer  - a function to call to perform a task which may succeed or fail
 * success    - an optional function to process the result of a successful call
 * failure    - an optional function to process the result of a failed call
 * opts       - an optional hash of options (see below)
 *
 * ntil() will return a handler that may be called with any number of arguments.
 * The performer function will receive these arguments, with a final "next" arg
 * appended to the argument list, such that it should be called on completion,
 * passing the result (as a single argument *or* multiple arguments) thus:
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * var ntil = require('ntil');
 * var handler = ntil(
 *   function(result) { return result === 3 },               // the checker
 *   function myFunc(a, b, next) { next(a + b) },            // the performer
 *   function(result) { console.log('success! ' + result) }, // on success
 *   function(result) { console.log('failure! ' + result) }, // on failure
 *   {logger: console}                                       // options
 * );
 *
 * handler(1, 1); // this will fail after 7 attempts (taking about a minute)
 * handler(1, 2); // this will succeed immediately
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * ...and here's the equivalent code in a syntax more similar to promises:
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * var ntil = require('./ntil');
 * var handler = ntil(
 *   function(result) { return result === 3 }
 * ).exec(
 *   function myFunc(a, b, next) { next(a + b) }
 * ).done(
 *   function(result) { console.log('success! ' + result) }
 * ).fail(
 *   function(result) { console.log('failure! ' + result) }
 * }.opts(
 *   {logger: console}
 * ).func();
 *
 * handler(1, 1); // this will fail after 7 attempts (taking about a minute)
 * handler(1, 2); // this will succeed immediately
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Note that the logger includes "myFunc" in log messages, because the function
 * is named. An alternative is to use the "name" option (see below).
 *
 * The "checker" function checks that the result is 3, causing the first handler
 * to fail (it has a result of 2, not 3) and the second handler to succeed.
 *
 * The output from both these examples is:
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * perform: 1 failure - trying again in 1 seconds
 * perform: success
 * success! 3
 * perform: 2 failures - trying again in 2 seconds
 * perform: 3 failures - trying again in 4 seconds
 * perform: 4 failures - trying again in 8 seconds
 * perform: 5 failures - trying again in 16 seconds
 * perform: 6 failures - trying again in 32 seconds
 * perform: too many failures (7)
 * failure! 2
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 *
 * The options may optionally include:
 * name:      The name of the "performer" function we're calling, e.g. "getData"
 * logger:    A logger object that responds to "info" and "warn" method calls
 * waitSecs:  The initial duration in seconds to wait before retrying
 * waitMult:  The factor by which to multiply the wait duration upon each retry
 * maxCalls:  The maximum number of calls to make before failing
 *
 * Note that "waitSecs" defaults to 1, "waitMult" defaults to 2, and "maxCalls"  * defaults to 7.
 *
 * Ideas for improvement? Email kevin.hutchinson@legendum.com
 */

(function() {
  "use strict";

  var sig = "Check params: function ntil(checker, performer, success, failure, opts)";

  function chain(checker, opts) {
    this.opts = function(options) { opts = options; return this }
    this.exec = function(perform) { this.perform = perform; return this };
    this.done = function(success) { this.success = success; return this };
    this.fail = function(failure) { this.failure = failure; return this };
    this.func = function() {
      return ntil(checker, this.perform, this.success, this.failure, opts);
    };
  }

  function ntil(checker, performer, success, failure, opts) {
    opts = opts || {};
    if (typeof checker !== 'function') throw sig;
    if (typeof performer !== 'function') return new chain(checker, performer);
    var name = opts.name || performer.name || 'anonymous function',
        logger = opts.logger,
        waitSecs = opts.waitSecs || 1,
        waitMult = opts.waitMult || 2,
        maxCalls = opts.maxCalls || 7; // it takes about a minute for 7 attempts

    return function() {
      var args = Array.prototype.slice.call(arguments, 0),
          wait = waitSecs,
          calls = 0;

      function next() {
        var result = Array.prototype.slice.call(arguments, 0);
        if (checker.apply(checker, result) === true) {
          if (logger) logger.info(name + ': success');
          if (typeof success === 'function') success.apply(success, result);
        } else {
          calls++;
          if (calls < maxCalls) {
            if (logger) logger.warn(name + ': ' + calls + ' failure' + (calls === 1 ? '' : 's') + ' - trying again in ' + wait + ' seconds');
            setTimeout(function() {
              invoke();
            }, wait * 1000);
            wait *= waitMult;
          } else {
            if (logger) logger.warn(name + ': too many failures (' + calls + ')');
            if (typeof failure === 'function') failure.apply(failure, result);
          }
        }
      }

      function invoke() {
        try {
          performer.apply(performer, args);
        } catch (e) {
          if (logger) logger.warn(name + ': exception "' + e + '"');
          next();
        }
      }

      args.push(next);
      invoke();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ntil;
  } else { // browser?
    this.ntil = ntil;
  }
}).call(this);

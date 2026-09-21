<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Laravel keeps a resolved guard for the lifetime of the application
     * instance, and the test application is reused across requests inside a
     * single test. Forgetting the guards first makes every authenticated request
     * re-read its bearer token, exactly as a fresh request would in real life —
     * without this, a second request in the same test keeps the first token's
     * user, and token expiry or revocation looks like it did not happen.
     */
    public function withToken($token, $type = 'Bearer')
    {
        $this->app['auth']->forgetGuards();

        return parent::withToken($token, $type);
    }
}


<?php

require '../vendor/autoload.php';

$server = new Flarum\Server\Server(
    Flarum\Foundation\Site::fromPaths([
        'base' => __DIR__.'/..',
        'public' => __DIR__,
        'storage' => __DIR__.'/../storage',
    ])
);

$server->listen();

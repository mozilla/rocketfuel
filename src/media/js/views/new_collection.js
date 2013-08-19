define('views/new_collection',
    ['cache', 'jquery', 'l10n', 'models', 'notification', 'requests', 'urls', 'utils', 'z'],
    function(cache, $, l10n, models, notification, requests, urls, utils, z) {

    var gettext = l10n.gettext;

    var collection_model = models('collection');

    z.body.on('submit', 'form#new_collection', function(e) {
        e.preventDefault();
        var data = utils.getVars($(this).serialize());
        requests.post(urls.api.url('collections'), data).done(function(data) {
            // Do a bunch of cache rewriting.
            collection_model.cast(data);
            cache.attemptRewrite(
                function(key) {
                    return utils.baseurl(key) == urls.api.unsigned.url('collections');
                },
                function(entry, key) {
                    entry.objects.unshift(data);
                    return entry;
                }
            );

            notification.notification({message: gettext('New collection created.')});
            z.page.trigger('navigate', [urls.reverse('collection', [data.id])]);
        }).fail(function() {
            notification.notification({message: gettext('Failed to create new collection.')})
        });
    });

    var types = {
        'basic': 0,
        'featured': 1,
        'operator': 2
    };

    return function(builder) {
        var args = utils.getVars();

        builder.start(
            'new_collection.html',
            {
                'region': parseInt(args.region, 10) || null,
                'category': parseInt(args.category, 10) || null,
                'carrier': parseInt(args.carrier, 10) || null,
                'type': types[args.type || 'basic']
            }
        );

        builder.z('type', 'leaf');
        builder.z('title', gettext('New Collection')); 
    };
});

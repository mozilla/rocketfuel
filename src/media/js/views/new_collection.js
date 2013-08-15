define('views/new_collection',
    ['jquery', 'l10n', 'notification', 'requests', 'urls', 'utils', 'z'],
    function($, l10n, notification, requests, urls, utils, z) {

    var gettext = l10n.gettext;

    z.body.on('submit', 'form#new_collection', function(e) {
        e.preventDefault();
        requests.post(
            urls.api.url('collections'),
            utils.getVars($(this).serialize())
        ).done(function(data) {
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
        var type = utils.getVars().type || 'basic';

        var args = utils.getVars();
        builder.start(
            'new_collection.html',
            {
                'region': args.region,
                'carrier': args.carrier,
                'category': args.category,
                'type': types[type]
            }
        );

        builder.z('type', 'leaf');
        builder.z('title', gettext('New Collection')); 
    };
});

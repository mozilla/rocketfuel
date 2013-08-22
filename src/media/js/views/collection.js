define('views/collection',
    ['cache', 'jquery', 'l10n', 'models', 'notification', 'requests', 'templates', 'urls', 'utils', 'z'],
    function(cache, $, l10n, models, notification, requests, nunjucks, urls, utils, z) {

    var gettext = l10n.gettext;
    var collection_model = models('collection');
    var app_model = models('app');

    z.page.on('click', 'a.add_app', function(e) {
        e.preventDefault();
        $('#app_search').removeClass('hidden');
    }).on('submit', '#app_search form', function(e) {
        e.preventDefault();
        var list = $('#app_search_results');
        requests.get(
            utils.urlparams(urls.api.url('search'), {'q': $('#app_search input[type=search]').val()})
        ).done(function(data) {
            list.html('');
            data.objects.forEach(function(v) {
                app_model.cast(v);
                list.append(nunjucks.env.getTemplate('helpers/app.html').render(
                    {'this': v, 'allow_delete': true}));
            });
        });

    }).on('click', '#app_search .close', function(e) {
        e.preventDefault();
        $('#app_search').addClass('hidden');

    }).on('click', 'a.app .delete', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $app = $(this).parent();
        $app.hide();
        var app_id = $app.data('id');
        var collection_id = $app.closest('.main').data('id');
        var app = app_model.lookup(app_id + '', 'id');
        requests.post(
            urls.api.url('remove_app', [collection_id]),
            {app: app.id}
        ).done(function() {
            // Do some cache rewriting.
            var collection = collection_model.lookup(collection_id);
            collection.apps = collection.apps.filter(function(coll_app) {
                return coll_app.id != app.id;
            });

            $app.remove();

            notification.notification({message: gettext('Removed {app} from collection.', {app: app.slug})});
        }).fail(function() {
            $app.show();
            notification.notification({message: gettext('Could not delete app from collection.')});
        });

    }).on('click', '#app_search a.app', function(e) {
        e.preventDefault();
        $('#app_search .close').trigger('click');
        var app = $(this).data('id');
        var collection = collection_model.lookup($('.main').data('id'));
        requests.post(
            urls.api.url('add_app', [collection.id]),
            {'app': app}
        ).done(function(data) {
            var app_data = app_model.lookup(app + '', 'id');
            $('.main ul.apps').append(
                nunjucks.env.getTemplate('helpers/app.html').render(
                    {'this': app_data, 'allow_delete': true}));
            notification.notification({message: gettext('App added to collection.')});

            // A bit of cache rewriting.
            collection.apps.push(app_data);

        }).fail(function() {
            notification.notification({message: gettext('Failed to add app.')});
        });

    }).on('click', '.delete_collection', function(e) {
        e.preventDefault();

        var collection_id = $(this).data('id');

        requests.del(urls.api.url('collection', [collection_id])).done(function() {
            // Rewrite the cache to remove the collection.
            collection_model.del(collection_id);
            cache.bust(urls.api.url('collection', [collection_id]));
            cache.attemptRewrite(
                function(key) {
                    return utils.baseurl(key) == urls.api.unsigned.url('collections');
                },
                function(entry, key) {
                    for (var coll in entry.objects) {
                        if (entry.objects[coll].id === collection_id) {
                            entry.objects.splice(coll, 1);
                            break;
                        }
                    }
                    return entry;
                }
            );

            notification.notification({message: gettext('Collection deleted.')});
            z.page.trigger('navigate', [urls.reverse('homepage')]);

        }).fail(function() {
            notification.notification({message: gettext('Failed to delete collection.')});
        });

    });

    return function(builder, params) {
        builder.start(
            'collection.html',
            {id: params[0]}
        );

        builder.onload('main', function(data) {
            data.apps.forEach(function(v) {
                app_model.cast(v);
            });
        });

        builder.z('type', 'leaf');
        builder.z('title', gettext('Collection')); 
    };
});

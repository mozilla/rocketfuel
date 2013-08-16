define('views/collection',
    ['jquery', 'l10n', 'models', 'notification', 'requests', 'templates', 'urls', 'utils', 'z'],
    function($, l10n, models, notification, requests, nunjucks, urls, utils, z) {

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
                list.append(nunjucks.env.getTemplate('helpers/app.html').render({'this': v}));
            });
        });
    }).on('click', '#app_search .close', function(e) {
        e.preventDefault();
        $('#app_search').addClass('hidden');
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
                nunjucks.env.getTemplate('helpers/app.html').render({'this': app_data}));
            notification.notification({message: gettext('App added to collection.')});

            collection.apps.push(app_data);
        }).fail(function() {
            notification.notification({message: gettext('Failed to add app.')});
        });
    });

    return function(builder, params) {
        builder.start(
            'collection.html',
            {id: params[0]}
        );

        builder.z('type', 'leaf');
        builder.z('title', gettext('Collection')); 
    };
});

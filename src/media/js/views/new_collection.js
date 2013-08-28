define('views/new_collection',
    ['cache', 'jquery', 'l10n', 'models', 'notification', 'requests', 'urls', 'utils', 'z'],
    function(cache, $, l10n, models, notification, requests, urls, utils, z) {

    var gettext = l10n.gettext;

    var collection_model = models('collection');

    z.body.on('submit', 'form#new_collection', function(e) {
        var $this = $(this);
        e.preventDefault();
        var data = utils.getVars($this.serialize());
        var $button = $this.find('.button');
        var button_text = $button.text();
        $button.addClass('disabled').html('<div class="spin spinner">');
        requests.post(urls.api.url('collections'), data).done(function(data) {
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
            $button.removeClass('disabled').text(button_text);
        });
    });

    z.page.on(
        'keyup',
        '#new_collection input[name=name], #duplicate_collection input[name=name]',
        function(e) {
            var $slug_field = $(this).closest('form').find('input[name=slug]');
            if ($slug_field.data('modified')) {
                return;
            }

            var $this = $(this);
            var value = $this.val().toLowerCase();
            value = value.replace(/[ _]/g, '-');
            value = value.replace(/[^-\w]/g, '');
            value = value.replace(/^[0-9]+/g, '');
            $slug_field.val(value);
            if (value) {
                $slug_field.attr('value', value);
            } else {
                $slug_field.removeAttr('value');
            }

        }
    ).on(
        'keypress',
        '#new_collection input[name=slug], #duplicate_collection input[name=slug]',
        function(e) { $(this).data('modified', true); }
    );

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

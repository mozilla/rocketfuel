define('views/new_collection',
    ['cache', 'jquery', 'l10n', 'models', 'notification', 'requests', 'urls', 'utils', 'z'],
    function(cache, $, l10n, models, notification, requests, urls, utils, z) {

    var gettext = l10n.gettext;

    var collection_model = models('collection');

    z.body.on('submit', 'form#new_collection', function(e) {
        var $this = $(this);
        e.preventDefault();
        var orig_data = utils.getVars($this.serialize());
        orig_data.is_public = false; // Collections are not public by default.

        // Turn 'carrierless' into NULL
        if ('carrier' in orig_data && orig_data.carrier === 'carrierless') {
            delete orig_data.carrier;
        }

        var $button = $this.find('.button');
        var button_text = $button.text();
        $button.addClass('disabled').html('<div class="spinner">');
        requests.post(urls.api.url('collections'), orig_data).done(function(data) {
            // TODO: Remove this once 905887 gets fixed.
            data.name[navigator.l10n.language] = orig_data.name;
            data.description[navigator.l10n.language] = orig_data.description;

            collection_model.cast(data);
            var list_endpoint = urls.api.base.url('collections');
            cache.attemptRewrite(
                function(key) {
                    if (utils.baseurl(key) !== list_endpoint) return false;
                    var params = utils.querystring(key);
                    // The category must match.
                    if (params.cat != (data.category || undefined)) return false;
                    // The region must match if both the key and the collection have a region.
                    if (data.region && params.region && params.region != data.region) return false;
                    // The carrier must match if both the key and the collection have a carrier.
                    if (data.carrier && params.carrier && params.carrier != data.carrier) return false;
                    // Otherwise it's good to go.
                    return true;
                },
                function(entry, key) {
                    entry.objects.unshift(data);
                    return entry;
                }
            );

            notification.notification({message: gettext('New collection created.')});
            z.page.trigger('navigate', [urls.reverse('collection', [data.slug])]);
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
            if ($slug_field.attr('maxlength')) {
                value = value.substr(0, $slug_field.attr('maxlength') | 0);  // Cap the slug length.
            }
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
                'region': args.region || null,
                'category': args.category || null,
                'carrier': args.carrier || null,
                'type': types[args.type || 'basic']
            }
        );

        builder.z('type', 'leaf');
        builder.z('title', gettext('New Collection'));
    };
});

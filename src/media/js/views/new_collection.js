define('views/new_collection',
	['l10n', 'notification', 'requests', 'urls', 'z'],
	function(l10n, notification, requests, urls, z) {

    var gettext = l10n.gettext;

    z.body.on('submit', 'form#new_collection', function(e) {
    	e.preventDefault();
    	requests.post(
    		urls.api.url('collections'),
    		{
    			name: $(this).find('[name=name]').val(),
    			description: $(this).find('[name=description]').val()
    		}
    	).done(function(data) {
    		notification.notification({message: gettext('New collection created.')});
    		z.page.trigger('navigate', [urls.reverse('collection', [data.id])]);
    	}).fail(function() {
    		notification.notification({message: gettext('Failed to create new collection.')})
    	});
    });

    return function(builder) {
        builder.start('new_collection.html');

        builder.z('type', 'leaf');
        builder.z('title', gettext('New Collection')); 
    };
});

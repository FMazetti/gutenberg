/**
 * External dependencies
 */
import { invert } from 'lodash';
import { v4 as uuid } from 'uuid';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	getMenuItemToClientIdMapping,
	resolveMenuItems,
	dispatch,
	apiFetch,
} from './controls';
import {
	menuItemsQuery,
	serializeProcessing,
	computeCustomizedAttribute,
} from './utils';

/**
 * Creates a menu item for every block that doesn't have an associated menuItem.
 * Requests POST /wp/v2/menu-items once for every menu item created.
 *
 * @param {Object} post A navigation post to process
 * @return {Function} An action creator
 */
export const createMissingMenuItems = serializeProcessing( function* ( post ) {
	const menuId = post.meta.menuId;

	const mapping = yield getMenuItemToClientIdMapping( post.id );
	const clientIdToMenuId = invert( mapping );

	const stack = [ post.blocks[ 0 ] ];
	while ( stack.length ) {
		const block = stack.pop();
		if ( ! ( block.clientId in clientIdToMenuId ) ) {
			const menuItem = yield apiFetch( {
				path: `/__experimental/menu-items`,
				method: 'POST',
				data: {
					title: 'Placeholder',
					url: 'Placeholder',
					menu_order: 0,
				},
			} );

			mapping[ menuItem.id ] = block.clientId;
			const menuItems = yield resolveMenuItems( menuId );
			yield dispatch(
				'core',
				'receiveEntityRecords',
				'root',
				'menuItem',
				[ ...menuItems, menuItem ],
				menuItemsQuery( menuId ),
				false
			);
		}
		stack.push( ...block.innerBlocks );
	}

	yield {
		type: 'SET_MENU_ITEM_TO_CLIENT_ID_MAPPING',
		postId: post.id,
		mapping,
	};
} );

/**
 * Converts all the blocks into menu items and submits a batch request to save everything at once.
 *
 * @param {Object} post A navigation post to process
 * @return {Function} An action creator
 */
export const saveNavigationPost = serializeProcessing( function* ( post ) {
	const menuId = post.meta.menuId;
	const menuItemsByClientId = mapMenuItemsByClientId(
		yield resolveMenuItems( menuId ),
		yield getMenuItemToClientIdMapping( post.id )
	);

	try {
		const response = yield* batchSave(
			menuId,
			menuItemsByClientId,
			post.blocks[ 0 ]
		);
		if ( ! response.success ) {
			throw new Error();
		}
		yield dispatch(
			noticesStore,
			'createSuccessNotice',
			__( 'Navigation saved.' ),
			{
				type: 'snackbar',
			}
		);
	} catch ( e ) {
		yield dispatch(
			noticesStore,
			'createErrorNotice',
			__( 'There was an error.' ),
			{
				type: 'snackbar',
			}
		);
	}
} );

function mapMenuItemsByClientId( menuItems, clientIdsByMenuId ) {
	const result = {};
	if ( ! menuItems || ! clientIdsByMenuId ) {
		return result;
	}
	for ( const menuItem of menuItems ) {
		const clientId = clientIdsByMenuId[ menuItem.id ];
		if ( clientId ) {
			result[ clientId ] = menuItem;
		}
	}
	return result;
}

function* batchSave( menuId, menuItemsByClientId, navigationBlock ) {
	const { nonce, stylesheet } = yield apiFetch( {
		path: '/__experimental/customizer-nonces/get-save-nonce',
	} );
	if ( ! nonce ) {
		throw new Error();
	}

	// eslint-disable-next-line no-undef
	const body = new FormData();
	body.append( 'wp_customize', 'on' );
	body.append( 'customize_theme', stylesheet );
	body.append( 'nonce', nonce );
	body.append( 'customize_changeset_uuid', uuid() );
	body.append( 'customize_autosaved', 'on' );
	body.append( 'customize_changeset_status', 'publish' );
	body.append( 'action', 'customize_save' );
	body.append(
		'customized',
		computeCustomizedAttribute(
			navigationBlock.innerBlocks,
			menuId,
			menuItemsByClientId
		)
	);

	return yield apiFetch( {
		url: '/wp-admin/admin-ajax.php',
		method: 'POST',
		body,
	} );
}

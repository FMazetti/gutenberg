/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import deprecated from '@wordpress/deprecated';

/**
 * @typedef {'top' | 'top left' | 'top right' | 'middle' | 'middle left' | 'middle right' | 'bottom' | 'bottom left' | 'bottom right'} AppearOrigin
 * @typedef {'left' | 'right'} SlideInOrigin
 * @typedef {{ type: 'appear'; origin?: AppearOrigin }} AppearOptions
 * @typedef {{ type: 'slide-in'; origin?: SlideInOrigin }} SlideInOptions
 * @typedef {{ type: 'loading'; }} LoadingOptions
 * @typedef {AppearOptions | SlideInOptions | LoadingOptions} GetAnimateOptions
 */

/* eslint-disable jsdoc/valid-types */
/**
 * @param {GetAnimateOptions['type']} type The animation type
 * @return {'top' | 'left'} Default origin
 */
function getDefaultOrigin( type ) {
	return type === 'appear' ? 'top' : 'left';
}
/* eslint-enable jsdoc/valid-types */

/**
 * @param {GetAnimateOptions} options
 *
 * @return {string | void} ClassName that applies the animations
 */
export function getAnimateClassName( options ) {
	if ( options.type === 'loading' ) {
		return classnames( 'components-animate__loading' );
	}

	const { type, origin = getDefaultOrigin( type ) } = options;

	if ( type === 'appear' ) {
		const [ yAxis, xAxis = 'center' ] = origin.split( ' ' );
		return classnames( 'components-animate__appear', {
			[ 'is-from-' + xAxis ]: xAxis !== 'center',
			[ 'is-from-' + yAxis ]: yAxis !== 'middle',
		} );
	}

	if ( type === 'slide-in' ) {
		return classnames(
			'components-animate__slide-in',
			'is-from-' + origin
		);
	}
}

// @ts-ignore Reason: Deprecated
export default function Animate( { type, options = {}, children } ) {
	deprecated( 'Animate component', {
		version: '9.7',
		alternative: 'getAnimateClassName',
		hint: '`<AnimatedComponent className={ getAnimateClassName() } />`',
	} );
	return children( {
		className: getAnimateClassName( { type, ...options } ),
	} );
}

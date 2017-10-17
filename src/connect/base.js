import React from 'react'
import PropTypes from 'prop-types'
import isNode from 'is-node-fn'

import debug from '../util/debug'
import { incrementNextQueryId } from '../redux/actions'

let nextClientQueryId = 0

export function _rewindNextClientQueryId () {
  nextClientQueryId = 0
}

/**
 * Base connect component.
 * @param {Function} target
 * @param {String} dataKey
 * @param {*} fallbackDataValue
 * @returns {KasiaConnectedComponent}
 */
export default function base (target, dataKey, fallbackDataValue) {
  const displayName = target.displayName || target.name

  return class KasiaConnectedComponent extends React.PureComponent {
    static __kasia__ = true

    static WrappedComponent = target

    static contextTypes = {
      store: PropTypes.object.isRequired
    }

    /** Make request for new data from WP-API. */
    _requestWpData (props) {
      const action = this._getRequestWpDataAction(props)
      this.props.dispatch(action)
    }

    /** Find the query for this component and its corresponding data
     *  and return props object containing them. */
    _reconcileWpData (props, query) {
      let data = fallbackDataValue

      if (query) {
        if (query.complete && query.OK) {
          if (query.preserve) {
            data = query.result
          } else {
            data = this._makePropsData(props, query)
          }
        } else if (query.error) {
          console.log(`[kasia] error in query for ${displayName}:`)
          console.log(query.error)
        }
      }

      debug(`${displayName} has content on \`props.kasia.${dataKey}\``)

      return {
        query: query || {
          complete: false,
          OK: null
        },
        [dataKey]: data
      }
    }

    componentWillMount () {
      const {__nextQueryId, queries} = this.props.wordpress

      if (isNode()) {
        this.queryId = __nextQueryId
      } else {
        this.queryId = nextClientQueryId
      }

      const query = queries[this.queryId]

      debug(`${displayName} will mount with queryId=${this.queryId}`)

      if (query && query.prepared) {
        debug(`${displayName} has prepared data at queryId=${this.queryId}`)
        if (isNode()) {
          this.props.dispatch(incrementNextQueryId())
        } else {
          nextClientQueryId++
        }
      } else {
        debug(`${displayName} initiating request in componentWillMount`)
        this._requestWpData(this.props)
        if (!isNode()) {
          nextClientQueryId++
        }
      }
    }

    componentWillReceiveProps (nextProps) {
      const {__nextQueryId, queries} = this.props.wordpress
      const query = queries[this.queryId]

      if (query && query.complete) {
        const willUpdate = this._shouldUpdate(this.props, nextProps, this.context.store.getState())

        if (willUpdate) {
          if (isNode()) {
            this.queryId = __nextQueryId
          } else {
            this.queryId = nextClientQueryId++
          }

          debug(`${displayName} initiating request: queryId=${this.queryId}, props: ${nextProps}`)

          this._requestWpData(nextProps)
        }
      }
    }

    render () {
      const query = this.props.wordpress.queries[this.queryId]
      const kasia = this._reconcileWpData(this.props, query)
      const props = Object.assign({}, this.props, { kasia })
      return React.createElement(target, props)
    }
  }
}
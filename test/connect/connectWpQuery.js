/* global jest:false, expect:false */

// jest.disableAutomock() hoisted here by babel-jest

import React from 'react'
import merge from 'lodash.merge'
import isNode from 'is-node-fn'
import { mount } from 'enzyme'

import { wrapQueryFn } from '../../src/connect/util'
import { ActionTypes } from '../../src/constants'

import '../__mocks__/WP'
import initialState from '../__mocks__/states/initial'
import multipleBooks from '../__mocks__/states/multipleBooks'
import bookJson from '../__fixtures__/wp-api-responses/book'
import {
  default as CustomQueryComponent,
  target,
  queryFn
} from '../__mocks__/components/CustomQuery'
import {
  default as PreserveQueryComponent,
  queryFn as preservedQueryFn
} from '../__mocks__/components/CustomQueryPreserve'

jest.disableAutomock()

const CustomQuery = (props, store) => mount(<CustomQueryComponent {...props} />, { context: { store } })
const PreserveQuery = (props, store) => mount(<PreserveQueryComponent {...props} />, { context: { store } })

function setup (state) {
  const dispatch = jest.fn()
  const subscribe = () => {}
  const getState = () => state
  const store = { dispatch, getState, subscribe }
  return { store }
}

jest.mock('is-node-fn')
isNode.mockReturnValue(false)

describe('connectWpQuery', () => {
  describe('non-preserved query', () => {
    it('should wrap the component', () => {
      // Components are wrapped first by react-redux connect()
      expect(CustomQueryComponent.WrappedComponent).toBe(target)
      expect(CustomQueryComponent.__kasia__).toBe(true)
    })

    it('should render loading message with bad query', () => {
      const state = merge({}, initialState('id'), {
        wordpress: {
          queries: {
            0: {}
          }
        }
      })
      const { store } = setup(state)
      const rendered = CustomQuery({ id: 10 }, store)
      expect(rendered.html()).toEqual('<div>Loading...</div>')
    })

    it('should render loading message with incomplete query', () => {
      const query = {
        id: 0,
        complete: false,
        OK: null,
        prepared: true
      }
      const state = merge({}, initialState('id'), {
        wordpress: {
          queries: {
            0: query
          }
        }
      })
      const { store } = setup(state)
      const rendered = CustomQuery({ id: 10 }, store)
      expect(rendered.html()).toEqual('<div>Loading...</div>')
    })

    it('should render prepared post data with complete query', () => {
      const { store } = setup(merge({}, multipleBooks, {
        wordpress: {
          queries: {
            0: {
              prepared: true
            }
          }
        }
      }))
      const rendered = CustomQuery({ id: bookJson.id }, store)
      expect(rendered.html()).toEqual(`<div>${bookJson.slug}</div>`)
    })

    it('should request data without query', () => {
      const { store } = setup(initialState('id'))
      CustomQuery({ id: 10 }, store)
      const action = store.dispatch.mock.calls[0][0]
      expect(action.type).toEqual(ActionTypes.RequestCreateQuery)
      expect(action.request.queryFn.toString()).toEqual(wrapQueryFn(queryFn).toString())
    })
  })

  describe('preserved query', () => {
    it('should display preserved query data', () => {
      const query = {
        id: 0,
        prepared: true,
        complete: true,
        OK: true,
        preserve: true,
        result: preservedQueryFn()
      }
      const state = merge({}, initialState('id'), {
        wordpress: {
          queries: {
            0: query
          }
        }
      })
      const { store } = setup(state)
      const rendered = PreserveQuery({}, store)
      expect(rendered.html()).toEqual('<div>Preserved Title</div>')
    })
  })
})

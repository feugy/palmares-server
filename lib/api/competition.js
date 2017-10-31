const Joi = require('joi')
const Competition = require('../models/competition')
const {notFound} = require('boom')

// fields used to return compact version of competitions
const compactFields = ['id', 'place', 'provider', 'date', 'url', 'dataUrls']

/**
 * Register competition endpoints.
 * Assumes server to attach storage to request.
 */
exports.register = (server, options, next) => {
  // list competitions
  server.route({
    method: 'GET',
    path: '/api/competition',
    handler: async ({query: {offset, size, provider}, storage}, reply) => {
      const criteria = provider ? {provider} : {}
      const values = await storage.find(Competition, criteria, compactFields, offset, size)
      reply({
        offset,
        size: values.length < size ? values.length : size,
        values
      })
    },
    config: {
      tags: ['api'],
      description: `list`,
      notes: `<p>Paginated list of available competition.</p>
              <p>Could be filtered by original provider.</p>`,
      validate: {
        query: {
          offset: Joi.number().integer().default(0)
            .description('Offset within entire dataset (0-based) of first result returned'),
          size: Joi.number().integer().default(20)
            .description('Number of result returned'),
          provider: Joi.string().valid('FFDS', 'WDSF', null)
            .description('Filtered provider. Omit to return all')
        }
      }
    }
  })

  // find competition by id
  server.route({
    method: 'GET',
    path: '/api/competition/{id}',
    handler: async ({params: {id}, storage}, reply) => {
      const competition = await storage.findById(Competition, id)
      reply(competition || notFound(`no competition with id ${id}`))
    },
    config: {
      tags: ['api'],
      description: `findById`,
      notes: `<p>Access all details of a competition (including contests).</p>
              <p>Returns 404 if no competition with such id could be found.</p>`,
      validate: {
        params: {
          id: Joi.string().required().description('Fetched competition id')
        }
      }
    }
  })

  // update competitions
  server.route({
    method: 'PUT',
    path: '/api/competition/update',
    handler: async ({palmares, query: {year: desiredYear}}, reply) => {
      const fetchedYear = desiredYear || new Date().getFullYear()
      const {competitions, year} = await palmares.update(fetchedYear)
      // group competitions by providers
      reply({
        year,
        ...competitions.reduce((groups, competition) => {
          const {provider, place, date, id} = competition
          if (!(provider in groups)) {
            groups[provider] = []
          }
          groups[provider].push({place, date, id})
          return groups
        }, {})
      })
    },
    config: {
      auth: 'jwt',
      tags: ['api'],
      description: `update`,
      notes: `<p>Update competition list by fetching new competitions from available providers.</p>
              <p>Requires authentication.</p>`,
      validate: {
        query: {
          year: Joi.number().optional().description('year retrieved')
        }
      }
    }
  })

  next()
}

exports.register.attributes = {name: 'collection'}

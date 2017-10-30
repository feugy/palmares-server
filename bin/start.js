const startServer = require('../')

startServer({
  port: process.env.PORT,
  storage: {
    name: 'Mongo',
    url: process.env.MONGO_URL
  },
  providers: [{
    name: 'FFDS',
    url: 'http://dansesportive.ffdanse.fr',
    list: 'compet-resultats.php',
    details: 'compet-resultats.php?NumManif=%1$s',
    clubs: 'compet-situation.php',
    couples: 'compet-situation.php?club_id=%1s&Recherche_Club=',
    search: 'compet-situation.php?couple_name=%1$s&Recherche_Nom=',
    dateFormat: 'DD/MM/YYYY'
  }, {
    name: 'WDSF',
    url: 'http://www.worlddancesport.org',
    list: 'Calendar/Competition/Results?format=csv&downloadFromDate=01/01/%1$s&downloadToDate=31/12/%1$s&kindFilter=Competition',
    dateFormat: 'YYYY/MM/DD'
  }]
})

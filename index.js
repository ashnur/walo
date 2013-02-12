void function(root){
    var chess = require('chess.js')
        , connect = require('connect')
        , app = connect().use(connect.static(__dirname + '/client'))
        , dnode = require('dnode')
        , shoe = require('shoe')
        , game = new chess.Chess()
        ;



    shoe(function(stream){
            var d = dnode(
                {
                    move : function (s, cb){
                        var state = game.move(s)
                            ;
                        cb(state, game.pgn())
                    }
                    , game_over : function (cb){
                        cb(game.game_over())
                    }
                    , in_check : function (cb){
                        cb(game.in_check())
                    }
                    , moves : function (options, cb){
                        if ( cb === undefined && typeof options == 'function' ) {
                            cb = options
                            options = undefined
                        }
                        cb(game.moves(options))
                    }
                    , reset : function (cb){
                        game.reset()
                        cb()
                    }
                    , undo : function (cb){
                        cb(game.undo())
                    }
                }
            )
            ;
            d.pipe(stream).pipe(d)
        }
    ).install(app.listen(3000), '/dnode');


}(this)

void function(root){
    var bonzo = require('bonzo')
        , qwery = require('qwery')
        , bean = require('bean')
        , $ = function(){ return bonzo(qwery.apply(null, arguments)); }
        , board = qwery('#board')[0]
        , dnode = require('dnode')
        , shoe = require('shoe')
        , result = document.getElementById('result')
        , undo = document.getElementById('undo')
        , stream = shoe('/dnode')
        , d = dnode()
        , chess = require('chess.js')
        , remote
        , note = bonzo(bonzo.create('<span>')).addClass('note')
    ;

    function incrementKey(obj,key,value){
        if ( obj[key] == undefined ) {
            obj[key] = value
        } else {
            obj[key] += value
        }
    }

    function isWhitePawn(game, sq){
        var p = game.get(sq);
        return p != null && p.type == 'p' && p.color == 'w'
    }

    function isBlackPawn(game, sq){
        var p = game.get(sq);
        return p != null && p.type == 'p' && p.color == 'b'
    }

    function pawnAttack(game, id){
        var c = id[0]
            , r = +id[1]
            , cs = 'abcdefgh'
            , targeted = 0
            , defended = 0
            ;
        // tl black pawn attacks
        //console.log ( c, r, c>'a', r<7,cs.indexOf(c),cs[cs.indexOf(c)-1]+(r+1), isBlackPawn(game, cs[cs.indexOf(c)-1]+(r+1)))
        if ( c > 'a' && r < 7  && isBlackPawn(game, cs[cs.indexOf(c)-1]+(r+1))) {
            targeted++
        }
        // tr black pawn attacks
        if ( c < 'h' && r < 7  && isBlackPawn(game, cs[cs.indexOf(c)+1]+(r+1))) {
            targeted++
        }
        // bl white pawn defends
        if ( c > 'a' && r > 2  && isWhitePawn(game, cs[cs.indexOf(c)-1]+(r-1))) {
            defended++
        }
        // br white pawn defends
        if ( c < 'h' && r > 2  && isWhitePawn(game, cs[cs.indexOf(c)+1]+(r-1))) {
            defended++
        }
        //console.log(id, targeted, defended)
        return {targeted:targeted, defended:defended}
    }



    function walk(game){
        var opp = (new chess.Chess(game.fen()))
            , colors = {}
            , moves
            , squares = []
            , move
            ;

        squares.length = 64
        opp.set_color(game.turn()=='w'?'b':'w')
        colors[game.turn()] = game
        colors[opp.turn()] = opp
        // loop over all the pieces
        moves = opp.moves({verbose:true,legal:false}).concat(game.moves({verbose:true,legal:false}))
        game.SQUARES.forEach(function(s, i){
            var pawnInfo
                , piece = game.get(s)
                , clone = new chess.Chess(game.fen())
                , movesHere = []
                ;

            squares[i] = {}
            squares[i].id = s

            if ( piece != null && piece.type != 'k' ) {
                clone.set_color(piece.color)
                clone.remove(s)
                movesHere = clone.moves({verbose:true,legal:false}).filter(function(m){
                    return m.to == s
                })
                if ( piece.color == 'w' ) {
                    incrementKey(squares[i], 'defended', movesHere.length)
                } else {
                    incrementKey(squares[i], 'targeted', movesHere.length)
                }
            }


            pawnInfo = pawnAttack(game, s)
            incrementKey(squares[i], 'defended', pawnInfo.defended)
            incrementKey(squares[i], 'targeted', pawnInfo.targeted)


            moves.forEach(function(m){
                if ( s == m.from ) {
                    incrementKey(squares[i], 'moves')
                }
                if ( s == m.to && ( m.piece != 'p' || m.flags.indexOf('c') != -1 ) ) {
                    if ( m.color == 'w' ) {
                        incrementKey(squares[i], 'defended', 1)
                    } else {
                        incrementKey(squares[i], 'targeted', 1)
                    }
                }
            })

        })

        squares.forEach(function(sq){
            var square
                , m = sq.moves || 0
                , t = sq.targeted || 0
                , d = sq.defended || 0
                ;
            square = bonzo(document.getElementById(sq.id.toUpperCase()))
            $('.moves', square).text(m)
            $('.targeted', square).text(t)
            $('.defended', square).text(d)
            if ( !m ) {
                square.removeClass('free')
            } else {
                square.addClass('free')
            }
            if ( t > d ) {
                square.addClass('threatened')
            } else {
                square.removeClass('threatened')
            }
            if ( t < d ) {
                square.addClass('defended')
            } else {
                square.removeClass('defended')
            }

        })
    }

    function ended(game){
        if ( game.game_over() ) {
            alert('game over')
            return true
        } else {
            return false
        }
    }

    function process(pgn){
        var game = new chess.Chess()
            ;
        game.load_pgn(pgn)
        if ( !ended(game) ) {
            walk(game)
        }
    }

    function move(attr){
        var piece, sq, cr;
        if ( attr != null ) {
            piece = qwery('a', document.getElementById(attr.from.toUpperCase()))
            sq = document.getElementById(attr.to.toUpperCase());
            $('a',sq).remove()
            bonzo(sq).append(piece)
            if ( attr.piece == 'k' ) {
                cr = attr.color == 'w' ? 1 : 8;
                if ( attr.flags.indexOf('k') != -1 ) {
                    move({from:'h'+cr, to: 'f'+cr})
                } else if ( attr.flags.indexOf('q') != -1 ) {
                    move({from:'a'+cr, to: 'd'+cr})
                }
            }
        }
    }

    bean.on(board, 'click', function(e){
        var sq = bonzo(e.target.nodeName === 'A' ? e.target.parentElement : e.target)
            , current = $('td.selected', board)
            ;
        if ( current.length == 0 ) {
            sq.addClass('selected')
        } else {
            remote.move(
                {
                    from:current.attr('id').toLowerCase()
                    , to:sq.attr('id').toLowerCase()
                }
                , function(attr, pgn){
                    if ( attr != null ) {
                        move(attr)
                        process(pgn)
                    }
                }
            )
            current.removeClass('selected')
        }
    })
    bean.on(undo, 'click', function(e){
        remote.undo(function(attr){
            if ( attr != null ) {
                var from = attr.to
                    , to = attr.from
                    ;
                attr.to = to
                attr.from = from
                move(attr)
            }
        });
    })
    bean.on(window, 'load', function(){
            ;
        d.on('remote', function (r) {
            remote = r
            remote.reset(function(){walk(new chess.Chess())})
        })
        d.pipe(stream).pipe(d)
        $('td').append(note.clone().addClass('moves').text(0))
        $('td').append(note.clone().addClass('defended').text(0))
        $('td').append(note.clone().addClass('targeted').text(0))
    })

}(this)


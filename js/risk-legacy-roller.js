function Battle(attacker, defender) {
    this.attacker = attacker;
    this.defender = defender;
    this.dice = undefined;
}
Battle.prototype.attack = function (attackers, defenders) {
    this.attackers = attackers;
    this.defenders = defenders;
    this.attacker.roll('attacker', attackers, defenders);
    this.defender.roll('defender', defenders, attackers);
}
Battle.prototype.get_die = function (side, index) {
    var territory = side == 'attacker' ? this.attacker : this.defender;
    return territory.dice[index];
}
Battle.prototype.add_missle = function (side, index) {
    var die = this.get_die(side, index);
    die.missle = true;
}
Battle.prototype.remove_missle = function (side, index) {
    var die = this.get_die(side, index);
    die.missle = false;
}
Battle.prototype.resolve = function () {
    /*
     Returns [attacker_loss, defender_loss, stop]
     */
    var attacker_loss = 0;
    var defender_loss = 0;
    var stop = false;

    this.attacker.resolve();
    this.defender.resolve();

    // Die Mechaniker Power 1
    if (this.defender.faction.power == 'fortify') {
        this.defender.add_bonus(1, 'all')
    }

    // Die Mechaniker Power 2
    if (this.defender.faction.power == 'sixes') {
        if (this.defender.dice.length == 2 && this.defender.dice[0].rolled == 6 && this.defender.dice[0].rolled == 6) {
            this.messages.push('Defenders rolled 2 natural 6\'s (with corresponding power); this territory cannot be attacked again for the rest of the turn.');
            return [2, 0, true];
        }
    }

    // Enclave of the Bear Power 1
    if (this.attacker.faction.power == 'firststrike') {
        this.defender.add_bonus(-1, 'lowest')
    }

    var defend_dice = this.defender.active_dice;
    var attack_dice = this.attacker.active_dice;
    this.dice = this.attacker.dice.dice.concat(this.defender.dice.dice);

    // Normal Resolution
    for (var i = 0; i < attack_dice.length; i++) {
        if (defend_dice[i].value() >= attack_dice[i].value()) {
            defend_dice[i].won = true;
            attack_dice[i].won = false;
            attacker_loss += 1;
        }
        else {
            defend_dice[i].won = false;
            attack_dice[i].won = true;
            defender_loss += 1;
        }
    }

    // Enclave of the Bear Power 2
    if (this.attacker.faction.power == 'naturalthree') {
        if (
            this.attacker.dice.length == 3
            && this.attacker.dice[0].rolled == this.attacker.dice[1].rolled
            && this.defender.dice[0].rolled == this.attacker.dice[2].rolled
            && defender_loss >= 1
        ) {
            this.messages.push('Attack roll is a natural three of a kind and at least one defending troop is defeated (with corresponding special power). Attacker conquers the territory.');
            return [attacker_loss, this.defender.armies, true];
        }
    }
    return [attacker_loss, defender_loss, stop, message];
}

function Territory(faction, fortified, scar, armies) {
    this.faction = faction;
    this.fortified = fortified;
    /*
     'bunker' : Higher defender die +1
     'ammoshortage' : Lower defender die -1
     */
    this.scar = scar;
    this.armies = armies;
    this.my_armies = undefined;
    this.opposing_armies = undefined;
    this.dice = undefined;
    this.active_dice = undefined;
    this.messages = [];
}
Territory.prototype.roll = function (side, armies, opposing_armies) {
    this.side = side;
    this.my_armies = armies;
    this.opposing_armies = opposing_armies;
    this.dice = new Dice(side, armies);
    this.dice.roll();
    this.active_dice = this.dice.active(Math.min(armies, opposing_armies));
}
Territory.prototype.resolve = function () {
    if (this.side == 'defender') {
        if (this.fortified >= 0) {
            this.add_bonus(1, 'all');
            if (this.attacking_armies == 3) {
                this.messages.push('Fortification reduced to ' + this.fortified);
                this.fortified -= 1;
            }
        }
        if (this.scar == 'bunker') {
            this.add_bonus(1, 'higher');
        }
        if (this.scar == 'ammoshortage') {
            this.add_bonus(-1, 'lower');
        }
    }
}
Territory.prototype.add_bonus = function (value, target) {
    if (target == 'all') {
        for (var die in this.active_dice) {
            die.bonus += value;
        }
    } else if (target == 'highest') {
        this.active_dice[0].bonus += value;
    } else if (target == 'lowest') {
        this.active_dice[this.active_dice.length - 1].bonus += value;
    }
}

function Faction(power) {
    /*
     Die Mechaniker
     fortify - 1) Your starting HQ is always treated as FORTIFIED (+1 to both dice) when you defend it.
     sixes - 2) If your defense roll is two natural 6s, that territory cannot be attacked again for the rest of the turn.

     Enclave of the Bear
     firststrike - 1) The defender subtracts 1 from his lower defense die in the first territory you attack during your turn.
     naturalthree - 2) If your attack roll is a natural three of a kind, and at least one defending troop is defeated, you conquer the territory. Remove all defending troops.
     */
    this.power = power;
}

function Dice(side, count) {
    this.side = side;
    this.count = count;
    this.dice = [];
    for (var i = 0; i < this.count; i++) {
        this.dice[i] = new Die(side, i);
    }
}
Dice.prototype.roll = function () {
    for (var die in this.dice) {
        this.dice[die].roll();
    }
}
Dice.prototype.active = function (count) {
    var sorted = this.dice.slice();
    sorted.sort(function (a, b) {
        return b.rolled - a.rolled
    })
    return sorted.slice(0, count);
}

function Die(side, counter) {
    this.side = side;
    this.index = counter;
    this.color = side == 'attacker' ? 'White' : 'Red';
    this.missle = false;
    this.rolled = 0;
    this.bonus = 0;
    this.won = false;
}

Die.prototype.roll = function () {
    this.rolled = Math.floor((Math.random() * 6) + 1);
}
Die.prototype.add_bonus = function (value) {
    this.bonus += value;
}
Die.prototype.value = function () {
    return this.missle == true ? 6 : this.rolled + this.bonus;
}
Die.prototype.rolled_image = function () {
    return this.image(this.rolled);
}
Die.prototype.value_image = function () {
    return this.image(this.value());
}
Die.prototype.image = function (score) {
    if (score <= 0) {
        return 'image/die' + this.color + '_border0.png'
    }
    else if (score >= 6) {
        return 'image/die' + this.color + '_border6.png'
    }
    else {
        return 'image/die' + this.color + '_border' + score + '.png'
    }
}

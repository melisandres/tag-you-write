<?php
require_once('Crud.php');

class GameInvitation extends Crud{

    public $table = 'game_invitation';
    public $primaryKey = ['id'];
    public $fillable = ['id', 
                        'game_id', 
                        'inviter_id', 
                        'invitee_id', 
                        'email', 
                        'token', 
                        'invited_at', 
                        'accepted_at', 
                        'declined_at', 
                        'message', 
                        'status', 
                        'can_invite_others'];
                        

    
}
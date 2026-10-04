<?php
namespace App\Mail;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable {
    use Queueable, SerializesModels;
    public $otp;
    public function __construct($otp){ $this->otp = $otp; }
    public function build(){
        return $this->subject('Your Marketplace OTP: '.$this->otp)
            ->html("<h2>Your OTP is {$this->otp}</h2><p>Valid for 10 minutes. Do not share.</p>");
    }
}

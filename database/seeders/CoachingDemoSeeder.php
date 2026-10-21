<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\CoachingInstitute;
use App\Models\InstituteProfile;
use App\Models\InstituteCourse;
use App\Models\InstituteView;
use App\Models\InstituteEnquiry;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class CoachingDemoSeeder extends Seeder
{
    public function run(): void
    {
        $email = 'abhishektutioncenter@gmail.com';
        $password = 'Abhishek@123';

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => 'Abhishek',
                'whatsapp' => '9000000010',
                'password' => Hash::make($password),
                'role' => 'coaching',
            ]
        );

        $institute = CoachingInstitute::firstOrCreate(
            ['user_id' => $user->id],
            [
                'institute_code' => 'COA-ABHI01',
                'name' => 'Abhishek Tuition Center',
                'institute_type' => 'private_coaching',
                'address' => '123 Main Street, Near City Market',
                'country_id' => 105,
                'state_id' => '14694',
                'district_id' => 678,
                'onboarding_status' => 'approved',
                'submitted_at' => now(),
            ]
        );

        $institute->profile()->updateOrCreate(
            ['institute_type' => 'coaching', 'institute_id' => $institute->id],
            [
                'contact_person' => 'Abhishek',
                'contact_email' => $email,
                'contact_phone' => '+919000000010',
                'detailed_address' => '123 Main Street, Near City Market',
                'country_id' => 105,
                'state_id' => '14694',
                'district_id' => 678,
                'established_year' => '2020',
                'board_affiliation' => 'CBSE',
                'recognition_status' => 'Recognised',
                'medium_of_instruction' => 'English',
                'student_strength' => '150',
                'streams' => ['Science', 'Commerce'],
                'classes' => ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
            ]
        );

        InstituteCourse::updateOrCreate(
            ['institute_type' => 'coaching', 'institute_id' => $institute->id, 'name' => 'Class 10 Maths'],
            [
                'subject' => 'Mathematics',
                'level' => 'Class 10',
                'batch' => '2025-26 Morning',
                'duration' => '6 months',
                'fee_range' => '₹2000-3000/month',
                'description' => 'Complete Class 10 Mathematics coaching',
            ]
        );
        InstituteCourse::updateOrCreate(
            ['institute_type' => 'coaching', 'institute_id' => $institute->id, 'name' => 'Class 12 Physics'],
            [
                'subject' => 'Physics',
                'level' => 'Class 12',
                'batch' => '2025-26 Evening',
                'duration' => '8 months',
                'fee_range' => '₹2500-3500/month',
                'description' => 'Class 12 Physics board exam preparation',
            ]
        );

        $monthStart = now()->startOfMonth();
        $viewDays = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 28];
        $viewCount = 0;
        foreach ($viewDays as $dayOffset) {
            $viewsThatDay = rand(1, 4);
            for ($v = 0; $v < $viewsThatDay; $v++) {
                $viewCount++;
                InstituteView::create([
                    'institute_type' => 'coaching',
                    'institute_id' => $institute->id,
                    'student_user_id' => $viewCount % 3 === 0 ? null : rand(100, 200),
                    'event' => $viewCount % 4 === 0 ? 'enquiry' : 'detail',
                    'country_name' => 'India',
                    'state_name' => 'Delhi',
                    'district_name' => 'Central Delhi',
                    'filter_q' => 'maths tuition near me',
                    'filter_type' => 'subject',
                    'source' => 'directory',
                    'created_at' => $monthStart->copy()->addDays($dayOffset)->addHours(rand(9, 20))->addMinutes(rand(0, 59)),
                ]);
            }
        }

        InstituteEnquiry::create([
            'institute_type' => 'coaching',
            'institute_id' => $institute->id,
            'student_user_id' => rand(100, 200),
            'name' => 'Priya Sharma',
            'contact' => '+919876543210',
            'enquiry_for' => 'Class 10 Maths batch timings and fee',
            'country_id' => 105,
            'state_id' => '14694',
            'district_id' => 678,
            'country_name' => 'India',
            'state_name' => 'Delhi',
            'district_name' => 'Central Delhi',
            'source' => 'directory',
            'created_at' => $monthStart->copy()->addDays(5)->addHours(14)->addMinutes(30),
        ]);
        InstituteEnquiry::create([
            'institute_type' => 'coaching',
            'institute_id' => $institute->id,
            'student_user_id' => null,
            'name' => 'Rahul Verma',
            'contact' => 'rahul@example.com',
            'enquiry_for' => 'Physics coaching for Class 12',
            'country_id' => 105,
            'state_id' => '14694',
            'district_id' => 678,
            'country_name' => 'India',
            'state_name' => 'Delhi',
            'district_name' => 'Central Delhi',
            'source' => 'detail',
            'created_at' => $monthStart->copy()->addDays(12)->addHours(10)->addMinutes(15),
        ]);
        InstituteEnquiry::create([
            'institute_type' => 'coaching',
            'institute_id' => $institute->id,
            'student_user_id' => rand(100, 200),
            'name' => 'Sneha Patel',
            'contact' => '+919123456789',
            'enquiry_for' => 'Demo class for Class 9 Science',
            'country_id' => 105,
            'state_id' => '14694',
            'district_id' => 678,
            'country_name' => 'India',
            'state_name' => 'Delhi',
            'district_name' => 'Central Delhi',
            'source' => 'directory',
            'created_at' => $monthStart->copy()->addDays(18)->addHours(16)->addMinutes(45),
        ]);
    }
}
<?php

RequirePage::model('Privilege');
RequirePage::model('User');

class ControllerUser extends Controller {

    public function index(){
     }


    public function create(){
        $privilege = new Privilege;
        $select = $privilege->select();
        $notifications = $this->getNotifications();

        Twig::render('user-create.php', [
            'privilege' => $select,
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }


    public function store(){
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('user/create');
            exit();
        }
        $this->validateUser($_POST);

        //create an array for the user
        //insert, and keep the id created

        //create an array for the writer
        //send it your user-id
        //and the bio
    
        //send to the login page
        //or log in for them, and send elsewhere


        extract($_POST);



        $user = new User;
        $options =[
            'cost'=>10,
        ];

        $passwordHash = password_hash($password, PASSWORD_BCRYPT, $options);
        $_POST['password']= $passwordHash;
        $insert = $user->insert($_POST);
        $notifications = $this->getNotifications();
        Twig::render('writer-index.php', [
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }

    public function validateUser($data){
        extract($data);
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('firstName')->value($firstName)->required()->max(45)->pattern('words');
        $val->name('lastName')->value($lastName)->required()->max(45)->pattern('words');
        $val->name('username')->value($username)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->required()->min(6)->max(20);
        $val->name('privilege_id')->value($privilege_id)->required();

        if($val->isSuccess()){
            //continue
        }else{
            $errors = $val->displayErrors();
            $privilege = new Privilege;
            $select = $privilege->select();
            $notifications = $this->getNotifications();
            Twig::render('user-create.php', [
                'privileges' => $select, 
                'errors' => $errors, 
                'data' => $_POST,
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
        };
    }

    /**
     * Toggle test privilege for dev mode testing
     * Only available to admin/dev users (privilege_id = 1)
     * Allows switching between privilege levels for testing purposes
     */
    public function toggleTestPrivilege() {
        // Check if user is authenticated
        if (!isset($_SESSION['writer_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'User not authenticated']);
            return;
        }

        // Check if user is admin/dev (only they can use this feature)
        if (!isset($_SESSION['privilege']) || $_SESSION['privilege'] != 1) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied. Admin privileges required.']);
            return;
        }

        // Get JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['privilege_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input. privilege_id required.']);
            return;
        }

        $privilegeId = (int)$input['privilege_id'];
        
        // Validate privilege_id (must be 1, 2, or 4)
        $validPrivileges = [1, 2, 4]; // admin, regular user, beta tester
        if (!in_array($privilegeId, $validPrivileges)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid privilege_id. Must be 1 (admin), 2 (regular), or 4 (beta tester).']);
            return;
        }

        // If setting to actual privilege (1), remove test_privilege (use real privilege)
        if ($privilegeId == $_SESSION['privilege']) {
            unset($_SESSION['test_privilege']);
        } else {
            // Set test privilege for testing
            $_SESSION['test_privilege'] = $privilegeId;
        }

        // Return success with current effective privilege
        RequirePage::library('Permissions');
        $effectivePrivilege = Permissions::getEffectivePrivilege();
        
        echo json_encode([
            'success' => true,
            'privilege_id' => $effectivePrivilege,
            'is_test_mode' => isset($_SESSION['test_privilege'])
        ]);
    }
}

?>
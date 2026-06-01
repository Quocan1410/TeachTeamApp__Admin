import { gql } from "@apollo/client";

// Auth Queries
export const ADMIN_LOGIN = gql`
    mutation AdminLogin($email: String!, $password: String!) {
        adminLogin(email: $email, password: $password) {
            success
            token
            message
            user {
                id
                email
                firstName
                lastName
                userType
                fullName
                avatarUrl
            }
        }
    }
`;

export const ADMIN_LOGOUT = gql`
    mutation AdminLogout {
        adminLogout
    }
`;

// User Queries
export const GET_ALL_USERS = gql`
    query GetAllUsers {
        getAllUsers {
            id
            email
            firstName
            lastName
            userType
            isBlocked
            createdAt
            fullName
        }
    }
`;

export const GET_USER_STATS = gql`
    query GetUserStats {
        getUserStats {
            totalUsers
            totalCandidates
            totalLecturers
            totalAdmins
            blockedUsers
        }
    }
`;

// User Mutations
export const BLOCK_USER = gql`
    mutation BlockUser($id: Int!) {
        blockUser(id: $id) {
            success
            message
            user {
                id
                isBlocked
            }
        }
    }
`;

export const UNBLOCK_USER = gql`
    mutation UnblockUser($id: Int!) {
        unblockUser(id: $id) {
            success
            message
            user {
                id
                isBlocked
            }
        }
    }
`;

export const DELETE_USER = gql`
    mutation DeleteUser($id: Int!) {
        deleteUser(id: $id) {
            success
            message
        }
    }
`;

// Course Queries
export const GET_ALL_COURSES = gql`
    query GetAllCourses {
        getAllCourses {
            id
            courseCode
            courseName
            semester
            description
            maxTutors
            maxLabAssistants
            applicationDeadline
            selectedTutors
            selectedLabAssistants
            availableTutors
            availableLabAssistants
            createdAt
            displayName
            courseAssignments {
                id
                lecturer {
                    id
                    firstName
                    lastName
                    email
                }
                assignedAt
            }
            applications {
                id
                status
                candidate {
                    id
                    firstName
                    lastName
                }
            }
        }
    }
`;

export const GET_UNASSIGNED_LECTURERS = gql`
    query GetUnassignedLecturers($courseId: Int) {
        getUnassignedLecturers(courseId: $courseId) {
            id
            firstName
            lastName
            email
        }
    }
`;

// Course Mutations
export const CREATE_COURSE = gql`
    mutation CreateCourse($input: CourseInput!) {
        createCourse(input: $input) {
            success
            message
            course {
                id
                courseCode
                courseName
                semester
                description
                maxTutors
                maxLabAssistants
                applicationDeadline
            }
        }
    }
`;

export const UPDATE_COURSE = gql`
    mutation UpdateCourse($id: Int!, $input: CourseInput!) {
        updateCourse(id: $id, input: $input) {
            success
            message
            course {
                id
                courseCode
                courseName
                semester
                description
                maxTutors
                maxLabAssistants
                applicationDeadline
            }
        }
    }
`;

export const DELETE_COURSE = gql`
    mutation DeleteCourse($id: Int!) {
        deleteCourse(id: $id) {
            success
            message
        }
    }
`;

// Report Queries
export const GET_CANDIDATES_CHOSEN_PER_COURSE = gql`
    query GetCandidatesChosenPerCourse {
        getCandidatesChosenPerCourse {
            course {
                id
                courseCode
                courseName
                semester
            }
            selectedCandidates {
                candidate {
                    id
                    firstName
                    lastName
                    email
                    fullName
                }
                course {
                    id
                    courseCode
                    courseName
                }
                selectedAt
                selectedBy {
                    id
                    firstName
                    lastName
                    fullName
                }
                application {
                    id
                    status
                    role {
                        id
                        roleName
                    }
                }
            }
            totalSelected
        }
    }
`;

export const GET_CANDIDATES_WITH_MULTIPLE_SELECTIONS = gql`
    query GetCandidatesWithMultipleSelections {
        getCandidatesWithMultipleSelections {
            candidate {
                id
                firstName
                lastName
                email
                fullName
            }
            selections {
                candidate {
                    id
                    firstName
                    lastName
                    fullName
                }
                course {
                    id
                    courseCode
                    courseName
                    semester
                }
                selectedAt
                selectedBy {
                    id
                    firstName
                    lastName
                    fullName
                }
                application {
                    id
                    role {
                        id
                        roleName
                    }
                }
            }
            totalSelections
        }
    }
`;

export const GET_UNSELECTED_CANDIDATES = gql`
    query GetUnselectedCandidates {
        getUnselectedCandidates {
            candidate {
                id
                firstName
                lastName
                email
                fullName
            }
            applications {
                id
                status
                appliedAt
                course {
                    id
                    courseCode
                    courseName
                    semester
                }
                role {
                    id
                    roleName
                }
            }
            totalApplications
        }
    }
`;

export const ASSIGN_LECTURER_TO_COURSE = gql`
    mutation AssignLecturerToCourse($lecturerId: Int!, $courseId: Int!) {
        assignLecturerToCourse(lecturerId: $lecturerId, courseId: $courseId) {
            success
            message
            assignment {
                id
                lecturer {
                    id
                    firstName
                    lastName
                    email
                }
                course {
                    id
                    courseCode
                    courseName
                }
                assignedAt
            }
        }
    }
`;

export const REMOVE_LECTURER_FROM_COURSE = gql`
    mutation RemoveLecturerFromCourse($lecturerId: Int!, $courseId: Int!) {
        removeLecturerFromCourse(lecturerId: $lecturerId, courseId: $courseId) {
            success
            message
        }
    }
`;

// Notification Queries
export const GET_MY_NOTIFICATIONS = gql`
    query GetMyNotifications($limit: Int) {
        getMyNotifications(limit: $limit) {
            unreadCount
            notifications {
                id
                type
                title
                message
                link
                read
                createdAt
                metadata
            }
        }
    }
`;

export const MARK_NOTIFICATION_AS_READ = gql`
    mutation MarkNotificationAsRead($id: Int!) {
        markNotificationAsRead(id: $id) {
            success
            message
            unreadCount
        }
    }
`;

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
    mutation MarkAllNotificationsAsRead {
        markAllNotificationsAsRead {
            success
            unreadCount
        }
    }
`;

export const DELETE_NOTIFICATION = gql`
    mutation DeleteNotification($id: Int!) {
        deleteNotification(id: $id) {
            success
            unreadCount
        }
    }
`;

// Announcements
export const GET_ALL_ANNOUNCEMENTS = gql`
    query GetAllAnnouncements {
        getAllAnnouncements {
            id
            title
            body
            audience
            startsAt
            endsAt
            isActive
            createdAt
            updatedAt
        }
    }
`;

export const CREATE_ANNOUNCEMENT = gql`
    mutation CreateAnnouncement($input: AnnouncementInput!) {
        createAnnouncement(input: $input) {
            success
            message
            announcement {
                id
                title
            }
        }
    }
`;

export const UPDATE_ANNOUNCEMENT = gql`
    mutation UpdateAnnouncement($id: Int!, $input: AnnouncementInput!) {
        updateAnnouncement(id: $id, input: $input) {
            success
            message
        }
    }
`;

export const DELETE_ANNOUNCEMENT = gql`
    mutation DeleteAnnouncement($id: Int!) {
        deleteAnnouncement(id: $id) {
            success
            message
        }
    }
`;

// Course Subscriptions
export const COURSE_UPDATES_SUBSCRIPTION = gql`
    subscription CourseUpdates {
        courseUpdates {
            courseId
            action
            timestamp
            message
        }
    }
`;

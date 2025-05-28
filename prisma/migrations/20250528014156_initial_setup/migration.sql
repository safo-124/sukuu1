-- CreateTable
CREATE TABLE `School` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `contactInfo` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `subdomain` VARCHAR(191) NULL,
    `customDomain` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `hasParentAppAccess` BOOLEAN NOT NULL DEFAULT false,
    `hasAutoTimetable` BOOLEAN NOT NULL DEFAULT false,
    `hasFinanceModule` BOOLEAN NOT NULL DEFAULT false,
    `hasAdvancedHRModule` BOOLEAN NOT NULL DEFAULT false,
    `hasProcurementModule` BOOLEAN NOT NULL DEFAULT false,
    `hasLibraryModule` BOOLEAN NOT NULL DEFAULT false,
    `hasTransportationModule` BOOLEAN NOT NULL DEFAULT false,
    `hasHostelModule` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `School_name_key`(`name`),
    UNIQUE INDEX `School_subdomain_key`(`subdomain`),
    UNIQUE INDEX `School_customDomain_key`(`customDomain`),
    INDEX `School_subdomain_idx`(`subdomain`),
    INDEX `School_customDomain_idx`(`customDomain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `hashedPassword` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `profilePictureUrl` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'SCHOOL_ADMIN', 'SECRETARY', 'PROCUREMENT_OFFICER', 'TEACHER', 'STUDENT', 'HR_MANAGER', 'ACCOUNTANT', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'HOSTEL_WARDEN', 'PARENT') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Parent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Parent_userId_key`(`userId`),
    INDEX `Parent_userId_idx`(`userId`),
    INDEX `Parent_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParentStudent` (
    `parentId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `relationToStudent` VARCHAR(191) NULL,

    INDEX `ParentStudent_studentId_idx`(`studentId`),
    PRIMARY KEY (`parentId`, `studentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SchoolLevel` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `SchoolLevel_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `SchoolLevel_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AcademicYear` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `AcademicYear_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `AcademicYear_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Term` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `academicYearId` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Term_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Term_academicYearId_name_key`(`academicYearId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Department_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Department_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Class` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `schoolLevelId` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Class_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Class_schoolLevelId_name_key`(`schoolLevelId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Section` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `classTeacherId` VARCHAR(191) NULL,
    `maxCapacity` INTEGER NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Section_classTeacherId_key`(`classTeacherId`),
    INDEX `Section_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Section_classId_name_key`(`classId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subject` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `subjectCode` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Subject_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Subject_schoolId_name_key`(`schoolId`, `name`),
    UNIQUE INDEX `Subject_schoolId_subjectCode_key`(`schoolId`, `subjectCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `studentIdNumber` VARCHAR(191) NOT NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `admissionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Student_userId_key`(`userId`),
    INDEX `Student_userId_idx`(`userId`),
    INDEX `Student_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Student_schoolId_studentIdNumber_key`(`schoolId`, `studentIdNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentEnrollment` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `academicYearId` VARCHAR(191) NOT NULL,
    `enrollmentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `StudentEnrollment_schoolId_idx`(`schoolId`),
    INDEX `StudentEnrollment_sectionId_idx`(`sectionId`),
    UNIQUE INDEX `StudentEnrollment_studentId_academicYearId_key`(`studentId`, `academicYearId`),
    UNIQUE INDEX `StudentEnrollment_studentId_sectionId_academicYearId_key`(`studentId`, `sectionId`, `academicYearId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `staffIdNumber` VARCHAR(191) NOT NULL,
    `jobTitle` VARCHAR(191) NOT NULL,
    `qualification` VARCHAR(191) NULL,
    `dateOfJoining` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `departmentId` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Staff_userId_key`(`userId`),
    INDEX `Staff_userId_idx`(`userId`),
    INDEX `Staff_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Staff_schoolId_staffIdNumber_key`(`schoolId`, `staffIdNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffLevelAssignment` (
    `staffId` VARCHAR(191) NOT NULL,
    `schoolLevelId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `StaffLevelAssignment_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`staffId`, `schoolLevelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffSubjectLevel` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `schoolLevelId` VARCHAR(191) NULL,
    `classId` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `StaffSubjectLevel_schoolId_idx`(`schoolId`),
    INDEX `StaffSubjectLevel_staffId_idx`(`staffId`),
    INDEX `StaffSubjectLevel_subjectId_idx`(`subjectId`),
    UNIQUE INDEX `StaffSubjectLevel_staffId_subjectId_schoolLevelId_classId_key`(`staffId`, `subjectId`, `schoolLevelId`, `classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` VARCHAR(191) NOT NULL,
    `studentEnrollmentId` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `takenById` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Attendance_schoolId_date_idx`(`schoolId`, `date`),
    UNIQUE INDEX `Attendance_studentEnrollmentId_date_key`(`studentEnrollmentId`, `date`),
    UNIQUE INDEX `UQ_Attendance_Section_Date_Enrollment`(`sectionId`, `date`, `studentEnrollmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffAttendance` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `StaffAttendance_schoolId_date_idx`(`schoolId`, `date`),
    UNIQUE INDEX `StaffAttendance_staffId_date_key`(`staffId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assignment` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NULL,
    `classId` VARCHAR(191) NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `maxMarks` DOUBLE NULL,
    `attachments` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Assignment_schoolId_subjectId_idx`(`schoolId`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubmittedAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `content` TEXT NULL,
    `attachments` JSON NULL,
    `marksObtained` DOUBLE NULL,
    `feedback` TEXT NULL,
    `gradedById` VARCHAR(191) NULL,
    `gradedAt` DATETIME(3) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `SubmittedAssignment_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `SubmittedAssignment_assignmentId_studentId_key`(`assignmentId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GradingScale` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `GradingScale_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GradeDetail` (
    `id` VARCHAR(191) NOT NULL,
    `gradingScaleId` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NOT NULL,
    `minPercentage` DOUBLE NOT NULL,
    `maxPercentage` DOUBLE NOT NULL,
    `gpaValue` DOUBLE NULL,

    UNIQUE INDEX `GradeDetail_gradingScaleId_grade_key`(`gradingScaleId`, `grade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grade` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `examScheduleId` VARCHAR(191) NULL,
    `termId` VARCHAR(191) NOT NULL,
    `academicYearId` VARCHAR(191) NOT NULL,
    `marksObtained` DOUBLE NULL,
    `gradeLetter` VARCHAR(191) NULL,
    `gpa` DOUBLE NULL,
    `comments` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Grade_studentId_subjectId_academicYearId_idx`(`studentId`, `subjectId`, `academicYearId`),
    INDEX `Grade_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Exam` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `termId` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Exam_schoolId_termId_name_key`(`schoolId`, `termId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `examId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `maxMarks` DOUBLE NOT NULL,
    `room` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `ExamSchedule_schoolId_examId_subjectId_idx`(`schoolId`, `examId`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamSubject` (
    `examId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `maxMarks` DOUBLE NULL,
    `passingMarks` DOUBLE NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `ExamSubject_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`examId`, `subjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimetableEntry` (
    `id` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `roomNo` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `TimetableEntry_schoolId_sectionId_dayOfWeek_idx`(`schoolId`, `sectionId`, `dayOfWeek`),
    INDEX `TimetableEntry_schoolId_staffId_dayOfWeek_idx`(`schoolId`, `staffId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `audience` JSON NULL,
    `isGlobal` BOOLEAN NOT NULL DEFAULT false,
    `schoolId` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Announcement_schoolId_publishedAt_idx`(`schoolId`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `schoolId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Event_schoolId_startDate_idx`(`schoolId`, `startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeeStructure` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `academicYearId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `FeeStructure_schoolId_name_academicYearId_key`(`schoolId`, `name`, `academicYearId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Invoice_invoiceNumber_key`(`invoiceNumber`),
    INDEX `Invoice_schoolId_studentId_status_idx`(`schoolId`, `studentId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `feeStructureId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `InvoiceItem_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `amount` DOUBLE NOT NULL,
    `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'MOBILE_MONEY', 'ONLINE_GATEWAY', 'OTHER') NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `processedById` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Payment_schoolId_invoiceId_idx`(`schoolId`, `invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ExpenseCategory_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `paidById` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Expense_schoolId_date_idx`(`schoolId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `defaultDays` INTEGER NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `LeaveType_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveApplication` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `leaveTypeId` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `approvedById` VARCHAR(191) NULL,
    `comments` VARCHAR(191) NULL,
    `appliedOn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `LeaveApplication_schoolId_staffId_status_idx`(`schoolId`, `staffId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollRecord` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `payPeriodStart` DATETIME(3) NOT NULL,
    `payPeriodEnd` DATETIME(3) NOT NULL,
    `basicSalary` DOUBLE NOT NULL,
    `allowances` DOUBLE NULL,
    `deductions` DOUBLE NULL,
    `netSalary` DOUBLE NOT NULL,
    `paymentDate` DATETIME(3) NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `PayrollRecord_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `PayrollRecord_staffId_payPeriodStart_payPeriodEnd_key`(`staffId`, `payPeriodStart`, `payPeriodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `Vendor_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Vendor_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `orderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expectedDeliveryDate` DATETIME(3) NULL,
    `totalAmount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `PurchaseOrder_orderNumber_key`(`orderNumber`),
    INDEX `PurchaseOrder_schoolId_vendorId_idx`(`schoolId`, `vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `inventoryItemId` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `PurchaseOrderItem_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `InventoryCategory_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `quantityInStock` INTEGER NOT NULL DEFAULT 0,
    `reorderLevel` INTEGER NULL,
    `supplierInfo` VARCHAR(191) NULL,
    `schoolId` VARCHAR(191) NOT NULL,

    INDEX `InventoryItem_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `InventoryItem_schoolId_name_key`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ClassSubjects` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ClassSubjects_AB_unique`(`A`, `B`),
    INDEX `_ClassSubjects_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Parent` ADD CONSTRAINT `Parent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Parent` ADD CONSTRAINT `Parent_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParentStudent` ADD CONSTRAINT `ParentStudent_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Parent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParentStudent` ADD CONSTRAINT `ParentStudent_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchoolLevel` ADD CONSTRAINT `SchoolLevel_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AcademicYear` ADD CONSTRAINT `AcademicYear_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Term` ADD CONSTRAINT `Term_academicYearId_fkey` FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Term` ADD CONSTRAINT `Term_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Class` ADD CONSTRAINT `Class_schoolLevelId_fkey` FOREIGN KEY (`schoolLevelId`) REFERENCES `SchoolLevel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Class` ADD CONSTRAINT `Class_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Section` ADD CONSTRAINT `Section_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Section` ADD CONSTRAINT `Section_classTeacherId_fkey` FOREIGN KEY (`classTeacherId`) REFERENCES `Staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Section` ADD CONSTRAINT `Section_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subject` ADD CONSTRAINT `Subject_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subject` ADD CONSTRAINT `Subject_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentEnrollment` ADD CONSTRAINT `StudentEnrollment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentEnrollment` ADD CONSTRAINT `StudentEnrollment_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentEnrollment` ADD CONSTRAINT `StudentEnrollment_academicYearId_fkey` FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentEnrollment` ADD CONSTRAINT `StudentEnrollment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffLevelAssignment` ADD CONSTRAINT `StaffLevelAssignment_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffLevelAssignment` ADD CONSTRAINT `StaffLevelAssignment_schoolLevelId_fkey` FOREIGN KEY (`schoolLevelId`) REFERENCES `SchoolLevel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffLevelAssignment` ADD CONSTRAINT `StaffLevelAssignment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSubjectLevel` ADD CONSTRAINT `StaffSubjectLevel_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSubjectLevel` ADD CONSTRAINT `StaffSubjectLevel_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSubjectLevel` ADD CONSTRAINT `StaffSubjectLevel_schoolLevelId_fkey` FOREIGN KEY (`schoolLevelId`) REFERENCES `SchoolLevel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSubjectLevel` ADD CONSTRAINT `StaffSubjectLevel_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSubjectLevel` ADD CONSTRAINT `StaffSubjectLevel_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_studentEnrollmentId_fkey` FOREIGN KEY (`studentEnrollmentId`) REFERENCES `StudentEnrollment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAttendance` ADD CONSTRAINT `StaffAttendance_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAttendance` ADD CONSTRAINT `StaffAttendance_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmittedAssignment` ADD CONSTRAINT `SubmittedAssignment_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmittedAssignment` ADD CONSTRAINT `SubmittedAssignment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmittedAssignment` ADD CONSTRAINT `SubmittedAssignment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GradingScale` ADD CONSTRAINT `GradingScale_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GradeDetail` ADD CONSTRAINT `GradeDetail_gradingScaleId_fkey` FOREIGN KEY (`gradingScaleId`) REFERENCES `GradingScale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grade` ADD CONSTRAINT `Grade_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grade` ADD CONSTRAINT `Grade_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grade` ADD CONSTRAINT `Grade_examScheduleId_fkey` FOREIGN KEY (`examScheduleId`) REFERENCES `ExamSchedule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grade` ADD CONSTRAINT `Grade_termId_fkey` FOREIGN KEY (`termId`) REFERENCES `Term`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grade` ADD CONSTRAINT `Grade_academicYearId_fkey` FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grade` ADD CONSTRAINT `Grade_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Exam` ADD CONSTRAINT `Exam_termId_fkey` FOREIGN KEY (`termId`) REFERENCES `Term`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Exam` ADD CONSTRAINT `Exam_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSchedule` ADD CONSTRAINT `ExamSchedule_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSchedule` ADD CONSTRAINT `ExamSchedule_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSchedule` ADD CONSTRAINT `ExamSchedule_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSubject` ADD CONSTRAINT `ExamSubject_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSubject` ADD CONSTRAINT `ExamSubject_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSubject` ADD CONSTRAINT `ExamSubject_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimetableEntry` ADD CONSTRAINT `TimetableEntry_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimetableEntry` ADD CONSTRAINT `TimetableEntry_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimetableEntry` ADD CONSTRAINT `TimetableEntry_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimetableEntry` ADD CONSTRAINT `TimetableEntry_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeStructure` ADD CONSTRAINT `FeeStructure_academicYearId_fkey` FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeStructure` ADD CONSTRAINT `FeeStructure_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeStructure` ADD CONSTRAINT `FeeStructure_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_feeStructureId_fkey` FOREIGN KEY (`feeStructureId`) REFERENCES `FeeStructure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseCategory` ADD CONSTRAINT `ExpenseCategory_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveType` ADD CONSTRAINT `LeaveType_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveApplication` ADD CONSTRAINT `LeaveApplication_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveApplication` ADD CONSTRAINT `LeaveApplication_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveApplication` ADD CONSTRAINT `LeaveApplication_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRecord` ADD CONSTRAINT `PayrollRecord_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRecord` ADD CONSTRAINT `PayrollRecord_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendor` ADD CONSTRAINT `Vendor_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryCategory` ADD CONSTRAINT `InventoryCategory_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `InventoryCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ClassSubjects` ADD CONSTRAINT `_ClassSubjects_A_fkey` FOREIGN KEY (`A`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ClassSubjects` ADD CONSTRAINT `_ClassSubjects_B_fkey` FOREIGN KEY (`B`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

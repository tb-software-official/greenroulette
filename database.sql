CREATE DATABASE IF NOT EXISTS GreenRoulette;
USE GreenRoulette;

CREATE TABLE players (
    address VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    total_win DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000,  -- accommodating large totals with fine precision
    total_donated DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000,
    partner_contribution DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000,
);

CREATE TABLE donations (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(255) NULL,
    donation_date DATE NOT NULL,
    donation_amount DECIMAL(18, 8) NOT NULL
);

CREATE TABLE total_donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_amount DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000
);

